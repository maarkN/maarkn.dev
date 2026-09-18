import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { db, dbConfigured } from "@/lib/db";

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

/** IP do cliente atras do Traefik. Falsificavel por quem fala direto com a app,
 * mas em producao so o proxy alcanca o container. Usado apenas para throttle,
 * nunca para autorizacao. */
export function loginClientIp(request: Request | undefined): string {
  if (!request) return "desconhecido";
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim().slice(0, 64);
  return "desconhecido";
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
