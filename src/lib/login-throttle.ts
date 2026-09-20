import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { db, dbConfigured } from "@/lib/db";
import { trustedClientIp, trustedProxyHops } from "@/lib/trusted-client-ip";

/**
 * Throttle DURAVEL de brute force no login do admin.
 *
 * ---------------------------------------------------------------------------
 * Por que isto existe
 * ---------------------------------------------------------------------------
 * O `/admin` nao tem middleware; a autenticacao e por sessao NextAuth
 * (Credentials + bcrypt). O e-mail do admin e PUBLICO — `.env.example` traz
 * `ADMIN_EMAIL=admin@maarkn.dev` e o repositorio e publico. Sem limite, sobra
 * adivinhacao de senha: um atacante bate direto em
 * `POST /api/auth/callback/credentials` (que NAO passa pela Server Action
 * `loginAction`, entao qualquer defesa colocada la seria contornada) e testa
 * senhas a vontade. Verificado em auditoria: 30 tentativas seguidas, nenhuma
 * recusada por rate limit.
 *
 * Efeito colateral igualmente perigoso: cada tentativa dispara um
 * `bcrypt.compare` com custo 12 (~centenas de ms de CPU). Sem teto, algumas
 * dezenas de requisicoes saturam o unico core da instancia — o login vira o
 * vetor de DoS mais barato do sistema. Por isso a checagem roda ANTES do
 * bcrypt, no topo de `authorize`.
 *
 * ---------------------------------------------------------------------------
 * Desenho
 * ---------------------------------------------------------------------------
 * - Contador por IP (hash), janela fixa. Reusa a tabela `McpRateLimit`, que ja
 *   e um KV de rate limit atomico (`INSERT ... ON CONFLICT DO UPDATE`), entao
 *   nao precisa de migration nova.
 * - O contador e incrementado em TODA tentativa, antes do veredito de senha:
 *   quem esta sendo recusado nao ganha tentativas de graca. A janela e curta,
 *   o teto e folgado o bastante para o admin errar a senha algumas vezes.
 * - Escopo por IP (nao por e-mail): um atacante que se auto-bloqueia so afeta o
 *   proprio IP; o admin, vindo de outro IP, entra normalmente. Bloquear por
 *   e-mail deixaria qualquer um trancar a conta do dono de fora.
 * - FALHA ABERTO so em erro inesperado de banco: durante uma queda de banco o
 *   proprio `authorize` ja recusa tudo (a verificacao de credencial precisa do
 *   banco), entao nao ha brute force a proteger, e travar o login legitimo por
 *   um soluco de banco seria pior. A recusa por LIMITE, essa sim, e firme.
 *
 * ---------------------------------------------------------------------------
 * A chave do contador: de onde sai o IP (premissa de deploy)
 * ---------------------------------------------------------------------------
 * Uma trava por IP so vale o que vale a chave. Se a chave sair de um valor que
 * o CLIENTE escolhe, nao existe trava: o atacante manda um
 * `X-Forwarded-For` diferente a cada tentativa, cada uma cai num balde novo, e
 * o brute force (mais o DoS de CPU por bcrypt) volta inteiro. Portanto NUNCA
 * leia o elemento mais a ESQUERDA da cadeia — esse e exatamente o pedaco que o
 * cliente escreve.
 *
 * A derivacao mora em `@/lib/trusted-client-ip` (ultimo salto confiavel +
 * normalizacao), compartilhada com o rate limit do `/api/mcp`: o mesmo defeito
 * ja foi escrito duas vezes, entao existe UM lugar para acertar. Ver o
 * cabecalho de la para a premissa de topologia, para `TRUSTED_PROXY_HOPS` e
 * para as formas de IP aceitas.
 *
 * `LOGIN_TRUSTED_PROXY_HOPS` sobrescreve `TRUSTED_PROXY_HOPS` so para o login.
 * Token que nao e um IP valido nao vira balde proprio: cai no balde
 * compartilhado `desconhecido`, porque qualquer lixo aceito como chave seria,
 * de novo, um bypass.
 */

const WINDOW_MS = intEnv("LOGIN_RATE_WINDOW_MS", 15 * 60_000); // 15 min
const MAX_ATTEMPTS = intEnv("LOGIN_RATE_MAX", 10);

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export type LoginThrottleVerdict =
  | { locked: false }
  | { locked: true; retryAfterSeconds: number };

/** sha256(ip) truncado — pseudonimo, nenhum IP cru vira linha no banco. */
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Chave do throttle: o IP escrito pelo ULTIMO salto confiavel (o Traefik),
 * nunca o valor cru que o cliente manda. Ver "A chave do contador" no
 * cabecalho. Usado apenas para throttle, nunca para autorizacao.
 */
export function loginClientIp(request: Request | undefined): string {
  return trustedClientIp(request, trustedProxyHops("LOGIN_TRUSTED_PROXY_HOPS"));
}

function windowStartOf(now: number): number {
  return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

/**
 * Registra uma tentativa de login do IP e diz se ele ja estourou o teto da
 * janela. Atomico: um unico `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`.
 *
 * Chame no INICIO de `authorize`, antes de qualquer bcrypt. Quando devolve
 * `{ locked: true }`, `authorize` deve retornar `null` imediatamente.
 */
export async function consumeLoginAttempt(ip: string): Promise<LoginThrottleVerdict> {
  if (!dbConfigured) return { locked: false };

  const now = Date.now();
  const windowStart = windowStartOf(now);
  const resetAt = windowStart + WINDOW_MS;
  const bucket = `login:ip:${hashIp(ip)}`;
  // TTL folgado para a linha sobreviver a relogios levemente dessincronizados.
  const expiresAt = new Date(resetAt + WINDOW_MS);

  try {
    const rows = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "McpRateLimit" ("id", "bucket", "windowStart", "count", "expiresAt", "updatedAt")
      VALUES (${randomUUID()}, ${bucket}, ${new Date(windowStart)}, 1, ${expiresAt}, NOW())
      ON CONFLICT ("bucket", "windowStart")
      DO UPDATE SET "count" = "McpRateLimit"."count" + 1, "updatedAt" = NOW()
      RETURNING "count"
    `;
    const count = rows[0]?.count;
    if (typeof count !== "number" || !Number.isFinite(count)) {
      // Nao conseguimos contar: falha aberto (ver cabecalho).
      return { locked: false };
    }
    if (count > MAX_ATTEMPTS) {
      return {
        locked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      };
    }
    return { locked: false };
  } catch (err) {
    // Erro inesperado de banco: falha aberto. Durante uma queda de banco o
    // proprio authorize ja recusa tudo, entao nao ha brute force a proteger.
    console.error("[login-throttle] falha ao contar tentativa:", err);
    return { locked: false };
  }
}
