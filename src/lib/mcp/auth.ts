import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db, dbConfigured } from "@/lib/db";
import { parseScopes, type McpScope } from "@/lib/mcp/scopes";
import { redactText, safeErrorMessage } from "@/lib/mcp/redact";

/**
 * Autenticacao do servidor MCP.
 *
 * O repositorio e PUBLICO. Tudo abaixo — formato da chave, algoritmo de hash,
 * ordem das checagens — e lido pelo atacante antes de ele tentar qualquer
 * coisa. Nada aqui depende de obscuridade; depende de entropia, de comparacao
 * timing-safe e de o segredo do servidor (o pepper) nunca estar no banco.
 *
 * ---------------------------------------------------------------------------
 * 1. Formato da chave
 * ---------------------------------------------------------------------------
 *   mk_live_<43 chars base64url>   (32 bytes = 256 bits de aleatorio de CSPRNG)
 *
 * O prefixo legivel serve a tres coisas: o dono sabe o que achou num arquivo de
 * config, o secret scanning do GitHub consegue casar um padrao, e o servidor
 * consegue recusar lixo antes de tocar o banco. `mk_test_` existe para dev
 * local, com o mesmo rigor.
 *
 * ---------------------------------------------------------------------------
 * 2. Por que HMAC-SHA256 com pepper, e nao bcrypt  (decisao pedida no briefing)
 * ---------------------------------------------------------------------------
 * bcrypt existe para proteger segredos de BAIXA entropia (senha escolhida por
 * humano): o custo por tentativa e o que torna o dicionario inviavel. Aqui o
 * segredo tem 256 bits de aleatorio — nao existe dicionario, nao existe
 * adivinhacao. Um atacante com o dump do banco enfrenta 2^256 tentativas, e
 * cada uma custaria o mesmo com bcrypt ou com SHA-256. O `work factor` nao
 * compra seguranca nenhuma neste caso, e cobra:
 *
 *   - ~100 ms de CPU por REQUISICAO no caminho quente (o proprio servidor vira
 *     o alvo de DoS mais barato do sistema: 10 requisicoes sem chave valida
 *     ocupam um core inteiro por segundo);
 *   - impossibilidade de localizar a chave por indice — bcrypt tem salt por
 *     linha, entao verificar exige rodar o KDF contra CADA chave da tabela;
 *   - o limite de 72 bytes de entrada do bcrypt, que trunca silenciosamente.
 *
 * O que bcrypt daria de graca — o salt — e irrelevante aqui (nao ha rainbow
 * table para 256 bits) e e substituido com vantagem pelo **pepper**:
 * `MCP_KEY_PEPPER` vive apenas no ambiente do servidor, nunca no banco. Um
 * vazamento SOMENTE do banco (SQL injection, backup, snapshot do EBS) nao
 * permite sequer verificar um palpite offline. bcrypt nao ofereceria isso.
 *
 * HMAC em vez de `sha256(pepper || token)` porque HMAC nao sofre extensao de
 * comprimento e e a construcao correta para "hash com chave".
 *
 * ---------------------------------------------------------------------------
 * 3. Comparacao timing-safe
 * ---------------------------------------------------------------------------
 * A busca no banco e por `keyPrefix` (dado PUBLICO — 8 chars do token, sem
 * valor para forjar o resto). A decisao de igualdade e sempre
 * `crypto.timingSafeEqual` sobre buffers de mesmo tamanho. **Nunca `===`**, e
 * nunca `WHERE keyHash = $1` como veredito de autenticacao: o `=` do Postgres
 * faz curto-circuito no primeiro byte e o tempo de resposta do indice vaza
 * informacao. Quando nenhuma candidata casa, ainda assim executamos uma
 * comparacao contra um buffer dummy, para que o caminho "chave inexistente"
 * custe o mesmo que "chave errada".
 *
 * ---------------------------------------------------------------------------
 * 4. Fail-closed
 * ---------------------------------------------------------------------------
 * Sem `DATABASE_URL`, sem pepper, ou com erro no banco: NEGA. Nao existe modo
 * degradado "deixa passar" — este endpoint escreve no funil de carreira
 * inteiro. (Contraste deliberado com `src/lib/rate-limit.ts`, que falha
 * aberto porque protege um chat publico de leitura.)
 */

const LIVE_PREFIX = "mk_live_";
const TEST_PREFIX = "mk_test_";
/** 32 bytes -> 43 chars base64url sem padding. */
const SECRET_BYTES = 32;
const SECRET_CHARS = 43;
/** Quantos chars do segredo entram no prefixo publico armazenado. */
const PREFIX_SECRET_CHARS = 8;

const TOKEN_RE = new RegExp(`^mk_(?:live|test)_[A-Za-z0-9_-]{${SECRET_CHARS}}$`);
const HASH_HEX_LEN = 64;
/** Buffer de comparacao para o caminho "nenhuma candidata". */
const DUMMY_HASH = Buffer.alloc(HASH_HEX_LEN / 2, 0);

/** Pepper minimo aceitavel. Menor que isto e falso conforto. */
const MIN_PEPPER_LEN = 32;

/** Janela de throttle do `lastUsedAt` — nao transforme toda leitura em escrita. */
const LAST_USED_THROTTLE_MS = 60_000;

export type McpAuthContext = {
  apiKeyId: string;
  /** Rotulo humano da chave. Nao e segredo. */
  name: string;
  /** Prefixo publico apresentado (`mk_live_ab12cd34`). Nao e segredo. */
  keyPrefix: string;
  scopes: McpScope[];
  expiresAt: Date | null;
};

export type McpAuthFailure =
  | "missing_header"
  | "malformed_header"
  | "malformed_key"
  | "unknown_key"
  | "revoked"
  | "expired"
  | "no_scopes"
  | "server_misconfigured"
  | "unavailable";

export type McpAuthResult =
  | { ok: true; auth: McpAuthContext }
  | {
      ok: false;
      reason: McpAuthFailure;
      /** Status HTTP a devolver. */
      status: 401 | 503;
      /** Texto pronto para o cliente. Generico de proposito quando o hash nao casou. */
      message: string;
      /** Prefixo apresentado, quando extraivel — util na auditoria de varredura. */
      keyPrefix: string | null;
    };

export type GeneratedApiKey = {
  /** A chave em claro. Exibida UMA vez e descartada — nunca persista isto. */
  token: string;
  /** Prefixo publico, para gravar em `ApiKey.keyPrefix` e mostrar na UI. */
  keyPrefix: string;
  /** HMAC-SHA256(pepper, token) em hex, para gravar em `ApiKey.keyHash`. */
  keyHash: string;
};

class MissingPepperError extends Error {
  constructor() {
    super(
      "MCP_KEY_PEPPER ausente ou curto demais (minimo de 32 chars). " +
        "Gere com: openssl rand -base64 48"
    );
    this.name = "MissingPepperError";
  }
}

function readPepper(): string {
  const pepper = process.env.MCP_KEY_PEPPER ?? "";
  if (pepper.length < MIN_PEPPER_LEN) throw new MissingPepperError();
  return pepper;
}

/**
 * HMAC-SHA256(pepper, token) em hex minusculo.
 * Nao exportado: ninguem fora daqui precisa transformar token em hash, e cada
 * lugar que precisasse seria mais um lugar por onde o token em claro passa.
 */
function computeKeyHash(token: string): string {
  return createHmac("sha256", readPepper()).update(token, "utf8").digest("hex");
}

/**
 * Gera uma chave nova. O `token` e a UNICA vez que a chave existe em claro —
 * mostre na UI, mande o usuario copiar, e nao grave em lugar nenhum.
 *
 * Lanca `MissingPepperError` se o pepper nao estiver configurado: e melhor a
 * criacao falhar ruidosamente do que nascer uma chave que o servidor nunca
 * vai conseguir validar.
 */
export function generateApiKey(environment: "live" | "test" = "live"): GeneratedApiKey {
  const prefix = environment === "test" ? TEST_PREFIX : LIVE_PREFIX;
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const token = `${prefix}${secret}`;
  return {
    token,
    keyPrefix: token.slice(0, prefix.length + PREFIX_SECRET_CHARS),
    keyHash: computeKeyHash(token),
  };
}

/** True quando o pepper esta configurado — para a UI avisar antes de tentar criar. */
export function isKeyGenerationConfigured(): boolean {
  return (process.env.MCP_KEY_PEPPER ?? "").length >= MIN_PEPPER_LEN;
}

/**
 * Extrai o token do header `Authorization: Bearer <token>`.
 * Devolve `null` (nunca lanca) e **nunca** ecoa o valor lido.
 */
export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer[ ]+(\S+)$/.exec(header.trim());
  return match ? match[1]! : null;
}

/** Prefixo publico de um token apresentado, para auditoria. `null` se nao parece um token. */
export function publicPrefixOf(token: string): string | null {
  if (!TOKEN_RE.test(token)) return null;
  const prefixLen = token.startsWith(TEST_PREFIX) ? TEST_PREFIX.length : LIVE_PREFIX.length;
  return token.slice(0, prefixLen + PREFIX_SECRET_CHARS);
}

const GENERIC_DENIAL = "Credencial invalida.";

function deny(
  reason: McpAuthFailure,
  status: 401 | 503,
  message: string,
  keyPrefix: string | null
): McpAuthResult {
  return { ok: false, reason, status, message, keyPrefix };
}

/**
 * Autentica um token apresentado.
 *
 * Ordem das checagens e proposital:
 *   formato -> pepper -> banco -> comparacao timing-safe -> revogacao ->
 *   expiracao -> escopos.
 *
 * As tres primeiras rejeitam sem tocar o banco (e sem gastar tempo
 * distinguivel entre "chave inexistente" e "lixo"). As tres ultimas so rodam
 * depois que o hash casou — por isso podem devolver o motivo exato ao cliente
 * sem vazar nada: quem chegou ali ja tinha a chave nas maos.
 */
export async function authenticateToken(token: string): Promise<McpAuthResult> {
  if (!TOKEN_RE.test(token)) {
    // Nao registre nem parte do valor: um token quase-valido continua sendo
    // material sensivel do lado de quem o enviou.
    return deny("malformed_key", 401, GENERIC_DENIAL, null);
  }
  const keyPrefix = publicPrefixOf(token);

  let presented: Buffer;
  try {
    presented = Buffer.from(computeKeyHash(token), "hex");
  } catch (err) {
    if (err instanceof MissingPepperError) {
      console.error("[mcp] MCP_KEY_PEPPER nao configurado — negando tudo.");
      return deny(
        "server_misconfigured",
        503,
        "Servidor MCP indisponivel.",
        keyPrefix
      );
    }
    console.error("[mcp] falha ao derivar hash:", safeErrorMessage(err));
    return deny("unavailable", 503, "Servidor MCP indisponivel.", keyPrefix);
  }

  if (!dbConfigured) {
    // Sem banco nao ha como verificar nem auditar. Nega (fail-closed).
    return deny("unavailable", 503, "Servidor MCP indisponivel.", keyPrefix);
  }

  let candidates: {
    id: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    scopes: string[];
    revokedAt: Date | null;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
  }[];
  try {
    candidates = await db.apiKey.findMany({
      where: { keyPrefix: keyPrefix! },
      select: {
        id: true,
        name: true,
        keyHash: true,
        keyPrefix: true,
        scopes: true,
        revokedAt: true,
        expiresAt: true,
        lastUsedAt: true,
      },
      // Prefixos sao praticamente unicos; o teto existe so para o caso
      // patologico de alguem plantar milhares de linhas com o mesmo prefixo.
      take: 20,
    });
  } catch (err) {
    console.error("[mcp] falha ao consultar ApiKey:", safeErrorMessage(err));
    return deny("unavailable", 503, "Servidor MCP indisponivel.", keyPrefix);
  }

  let matched: (typeof candidates)[number] | null = null;
  for (const candidate of candidates) {
    // Um hash fora do formato (nunca deveria existir: ha CHECK no banco) e
    // tratado como nao-match, sem lancar.
    if (candidate.keyHash.length !== HASH_HEX_LEN) continue;
    const stored = Buffer.from(candidate.keyHash, "hex");
    if (stored.length !== presented.length) continue;
    if (timingSafeEqual(stored, presented)) matched = candidate;
  }

  if (!matched) {
    // Comparacao dummy: o caminho "nenhuma candidata" custa o mesmo que o
    // caminho "candidata errada".
    timingSafeEqual(presented, DUMMY_HASH);
    return deny("unknown_key", 401, GENERIC_DENIAL, keyPrefix);
  }

  if (matched.revokedAt) {
    return deny("revoked", 401, "Chave revogada.", matched.keyPrefix);
  }
  if (matched.expiresAt && matched.expiresAt.getTime() <= Date.now()) {
    return deny("expired", 401, "Chave expirada.", matched.keyPrefix);
  }

  const scopes = parseScopes(matched.scopes);
  if (scopes.length === 0) {
    // Chave sem escopo reconhecido autentica mas nao pode nada. Recusar aqui
    // e mais honesto (e mais barato) do que deixar toda tool responder 403.
    return deny("no_scopes", 401, "Chave sem escopos validos.", matched.keyPrefix);
  }

  touchLastUsed(matched.id, matched.lastUsedAt);

  return {
    ok: true,
    auth: {
      apiKeyId: matched.id,
      name: matched.name,
      keyPrefix: matched.keyPrefix,
      scopes,
      expiresAt: matched.expiresAt,
    },
  };
}

/**
 * Autentica a partir do `Request`. Wrapper fino sobre `authenticateToken` —
 * existe para que o route handler nunca precise tocar no header cru.
 */
export async function authenticateRequest(request: Request): Promise<McpAuthResult> {
  const raw = request.headers.get("authorization");
  if (!raw) return deny("missing_header", 401, "Authorization ausente.", null);
  const token = extractBearerToken(request);
  if (!token) {
    return deny(
      "malformed_header",
      401,
      "Authorization deve ser 'Bearer <chave>'.",
      null
    );
  }
  return authenticateToken(token);
}

/**
 * Atualiza `lastUsedAt` no maximo 1x por minuto por chave, sem bloquear a
 * resposta. Falha e engolida de proposito: perder o carimbo de uso e um
 * incomodo operacional, negar a chamada por causa dele seria pior.
 */
function touchLastUsed(apiKeyId: string, lastUsedAt: Date | null): void {
  const now = Date.now();
  if (lastUsedAt && now - lastUsedAt.getTime() < LAST_USED_THROTTLE_MS) return;
  void db.apiKey
    .update({ where: { id: apiKeyId }, data: { lastUsedAt: new Date(now) } })
    .catch((err: unknown) => {
      console.error("[mcp] falha ao gravar lastUsedAt:", safeErrorMessage(err));
    });
}

/**
 * Valor do header `WWW-Authenticate` de uma recusa. RFC 6750: o `error` e um
 * codigo fechado, nao o motivo interno — o motivo detalhado fica na auditoria.
 */
export function wwwAuthenticateHeader(reason: McpAuthFailure): string {
  const code =
    reason === "missing_header"
      ? ""
      : reason === "no_scopes"
        ? ', error="insufficient_scope"'
        : ', error="invalid_token"';
  return `Bearer realm="mcp"${code}`;
}

/** Reexport conveniente: quem monta mensagem de erro tem que redigir antes. */
export { redactText };
