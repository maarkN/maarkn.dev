import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { db, dbConfigured } from "@/lib/db";
import { safeErrorMessage } from "@/lib/mcp/redact";
import { trustedClientIp } from "@/lib/trusted-client-ip";

/**
 * Rate limit DURAVEL e FAIL-CLOSED do servidor MCP.
 *
 * ---------------------------------------------------------------------------
 * Por que nao reusar `src/lib/rate-limit.ts`
 * ---------------------------------------------------------------------------
 * Aquele limitador e um `Map` no processo e, quando nao consegue decidir, deixa
 * passar. Dois defeitos que aqui seriam inaceitaveis:
 *
 *   1. **In-memory.** Contador por processo. Dois containers (ou um restart) =
 *      contador zerado. Num endpoint de LEITURA publica isso e um desperdicio
 *      tolerado; num endpoint de ESCRITA autenticada e um bypass trivial.
 *   2. **Falha aberto.** Se a checagem quebra, a requisicao passa. Num endpoint
 *      que grava no funil de carreira inteiro, "na duvida, deixa entrar" e
 *      exatamente a decisao errada.
 *
 * Aqui o contador vive na tabela `McpRateLimit` (janela fixa) e **qualquer**
 * falha — banco fora, `DATABASE_URL` ausente, timeout, erro de SQL — NEGA a
 * requisicao. Ficar indisponivel e o comportamento correto: o MCP e a unica
 * porta de escrita e nao ha nada aqui que precise responder sob degradacao.
 *
 * ---------------------------------------------------------------------------
 * Por que janela fixa e nao token bucket / sliding window
 * ---------------------------------------------------------------------------
 * Janela fixa cabe num unico `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`,
 * que e **atomico sob concorrencia** sem transacao explicita e sem `SELECT`
 * antes (que abriria uma janela de corrida entre instancias). O custo e o
 * classico burst de fronteira: no pior caso o cliente emite 2x o limite em
 * torno da virada. Para um endpoint de sincronizacao operado por um agente
 * unico isso e irrelevante, e a alternativa (contagem deslizante) exigiria ler
 * N linhas por chamada.
 *
 * O contador e incrementado ANTES do veredito, de proposito: uma requisicao
 * recusada tambem consome cota. Quem esta batendo no limite nao ganha
 * tentativas de graca por estar sendo recusado.
 */

export type RateBucketSpec = {
  /** Identificador do balde. Nunca contenha segredo — vira linha no banco. */
  bucket: string;
  limit: number;
  windowMs: number;
  /** Rotulo curto para a auditoria (ex.: "ip_por_minuto"). */
  label: string;
};

export type RateVerdict =
  | { ok: true }
  | {
      ok: false;
      /** `rate_limited` = estourou a cota. `unavailable` = nao deu para contar. */
      reason: "rate_limited" | "unavailable";
      /** Qual balde barrou (rotulo, nao o valor cru). */
      label: string;
      limit: number;
      /** Epoch ms em que a janela vira. */
      resetAt: number;
      retryAfterSeconds: number;
      /**
       * `true` apenas na PRIMEIRA requisicao que cruza o limite dentro da
       * janela. Quem audita usa isto para gravar UMA linha por balde/janela em
       * vez de uma por requisicao recusada — sem isso, um flood anonimo vira
       * um `INSERT` em `McpAuditLog` por pacote e a recusa custa mais disco ao
       * servidor do que custa banda ao atacante. O volume real da rajada fica
       * no proprio contador de `McpRateLimit`, que e `UPDATE` e nao cresce.
       */
      firstBreach: boolean;
    };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Limites padrao. Dimensionados para a primeira sincronizacao do vault
 * (103 arquivos / ~35 pastas, uma tool call por arquivo alterado) caber com
 * folga, e ainda assim tornar caro varrer o endpoint.
 */
const LIMITS = {
  /** Pre-auth, por IP: e o que segura varredura de chave e flood anonimo. */
  ipPerMinute: () => intEnv("MCP_RATE_IP_PER_MIN", 60),
  /** Requisicoes HTTP por chave. */
  keyPerMinute: () => intEnv("MCP_RATE_KEY_PER_MIN", 120),
  keyPerHour: () => intEnv("MCP_RATE_KEY_PER_HOUR", 3000),
  /** Chamadas de tool por chave (uma requisicao pode trazer um batch). */
  toolCallsPerMinute: () => intEnv("MCP_RATE_TOOL_PER_MIN", 240),
  /** Chamadas de tool de ESCRITA por chave — teto mais apertado. */
  writeCallsPerMinute: () => intEnv("MCP_RATE_WRITE_PER_MIN", 120),
};

/** O IP nunca vai cru para a tabela: hash trunca o dado pessoal e o tamanho. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * IP do cliente atras do Traefik, para rate limit (nunca para autorizacao).
 *
 * Le o ULTIMO salto confiavel da cadeia, jamais o primeiro elemento. O
 * primeiro elemento e escrito pelo CLIENTE: com ele como chave, um
 * `X-Forwarded-For` novo a cada requisicao dava um balde novo a cada
 * requisicao, e o teto de 60/min por IP — a unica defesa PRE-AUTENTICACAO
 * deste endpoint, a que impede o flood anonimo de encher o `McpAuditLog` —
 * nao segurava nada. A derivacao e a normalizacao (IPv4 mapeado, porta,
 * colchetes, zona) sao compartilhadas com o throttle do login em
 * `@/lib/trusted-client-ip`: um lugar so para acertar.
 */
export function clientIp(request: Request): string {
  return trustedClientIp(request);
}

/** Inicio da janela fixa que contem `now`. */
function windowStartOf(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

/**
 * Incrementa um balde e devolve a contagem resultante. Atomico: um unico
 * `INSERT ... ON CONFLICT DO UPDATE` — sem `SELECT` antes, sem corrida entre
 * instancias. Lanca se o banco falhar (quem chama transforma isso em NEGAR).
 */
async function bump(bucket: string, windowStart: Date, expiresAt: Date): Promise<number> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "McpRateLimit" ("id", "bucket", "windowStart", "count", "expiresAt", "updatedAt")
    VALUES (${randomUUID()}, ${bucket}, ${windowStart}, 1, ${expiresAt}, NOW())
    ON CONFLICT ("bucket", "windowStart")
    DO UPDATE SET "count" = "McpRateLimit"."count" + 1, "updatedAt" = NOW()
    RETURNING "count"
  `;
  const count = rows[0]?.count;
  if (typeof count !== "number" || !Number.isFinite(count)) {
    throw new Error("rate limit: contagem invalida");
  }
  return count;
}

/**
 * Consome uma unidade em cada balde, em ordem, parando no primeiro que estoura.
 *
 * Contrato: **nunca lanca**. Erro vira `{ ok: false, reason: "unavailable" }`,
 * que o chamador deve traduzir em recusa (503), nao em "segue o jogo".
 */
export async function consumeBuckets(specs: RateBucketSpec[]): Promise<RateVerdict> {
  if (!dbConfigured) {
    // Sem banco nao ha contador durável. Fail-closed, por definicao.
    return unavailable(specs[0]?.label ?? "desconhecido", 0, Date.now() + MINUTE);
  }

  const now = Date.now();
  try {
    for (const spec of specs) {
      const start = windowStartOf(now, spec.windowMs);
      const resetAt = start + spec.windowMs;
      // TTL folgado para a linha sobreviver a relogios levemente dessincronizados.
      const expiresAt = new Date(resetAt + spec.windowMs);
      const count = await bump(spec.bucket, new Date(start), expiresAt);
      if (count > spec.limit) {
        return {
          ok: false,
          reason: "rate_limited",
          label: spec.label,
          limit: spec.limit,
          resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
          firstBreach: count === spec.limit + 1,
        };
      }
    }
  } catch (err) {
    console.error("[mcp] rate limit indisponivel — negando:", safeErrorMessage(err));
    return unavailable(specs[0]?.label ?? "desconhecido", 0, now + MINUTE);
  }

  sweepExpiredOccasionally();
  return { ok: true };
}

function unavailable(label: string, limit: number, resetAt: number): RateVerdict {
  return {
    ok: false,
    reason: "unavailable",
    label,
    limit,
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
    // Indisponibilidade e rara e sempre interessante: sempre audite.
    firstBreach: true,
  };
}

/**
 * Gate de REQUISICAO HTTP. Chamado duas vezes no route handler:
 * antes da autenticacao (so o balde de IP) e depois dela (baldes da chave).
 * Separar as duas fases e o que impede uma chave valida de ser bloqueada por
 * um vizinho barulhento no mesmo IP, e ao mesmo tempo mantem o custo de
 * varrer o endpoint sem chave.
 */
export function consumeIpBudget(ip: string): Promise<RateVerdict> {
  const hashed = hashIp(ip);
  return consumeBuckets([
    {
      bucket: `ip:${hashed}:1m`,
      limit: LIMITS.ipPerMinute(),
      windowMs: MINUTE,
      label: "ip_por_minuto",
    },
  ]);
}

export function consumeKeyBudget(apiKeyId: string): Promise<RateVerdict> {
  return consumeBuckets([
    {
      bucket: `key:${apiKeyId}:1m`,
      limit: LIMITS.keyPerMinute(),
      windowMs: MINUTE,
      label: "chave_por_minuto",
    },
    {
      bucket: `key:${apiKeyId}:1h`,
      limit: LIMITS.keyPerHour(),
      windowMs: HOUR,
      label: "chave_por_hora",
    },
  ]);
}

/**
 * Gate de CHAMADA DE TOOL. Uma unica requisicao JSON-RPC pode carregar um
 * batch com N chamadas; sem este segundo gate, o teto por requisicao seria
 * contornavel empacotando tudo num POST so.
 */
export function consumeToolCallBudget(
  apiKeyId: string,
  options: { isWrite: boolean }
): Promise<RateVerdict> {
  const specs: RateBucketSpec[] = [
    {
      bucket: `key:${apiKeyId}:calls:1m`,
      limit: LIMITS.toolCallsPerMinute(),
      windowMs: MINUTE,
      label: "tools_por_minuto",
    },
  ];
  if (options.isWrite) {
    specs.push({
      bucket: `key:${apiKeyId}:writes:1m`,
      limit: LIMITS.writeCallsPerMinute(),
      windowMs: MINUTE,
      label: "escritas_por_minuto",
    });
  }
  return consumeBuckets(specs);
}

let lastSweepAt = 0;
const SWEEP_INTERVAL_MS = 5 * MINUTE;

/**
 * Limpeza oportunista das janelas vencidas. Roda no maximo a cada 5 min por
 * processo, fora do caminho critico e com o erro engolido: se a varredura
 * falhar, o unico prejuizo e uma tabela um pouco maior.
 */
function sweepExpiredOccasionally(): void {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  void db.mcpRateLimit
    .deleteMany({ where: { expiresAt: { lt: new Date(now) } } })
    .catch((err: unknown) => {
      console.error("[mcp] falha ao limpar McpRateLimit:", safeErrorMessage(err));
    });
}
