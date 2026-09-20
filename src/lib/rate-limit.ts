/**
 * Tiny in-memory token-bucket-ish limiter, scoped to one node process.
 * Good enough for a single-instance deploy or local dev. Replace with a
 * Redis-backed implementation when the site goes multi-region.
 */

import { trustedClientIp } from "@/lib/trusted-client-ip";

type Entry = { count: number; resetAt: number };

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const STORE = new Map<string, Entry>();
// Mirror the DB limiter's config so the fallback behaves the same when there's
// no database (see lib/chat-log.ts).
const WINDOW_MS = intEnv("CHAT_RATE_WINDOW_MS", 60 * 60 * 1000); // 1 hour
const MAX_REQUESTS = intEnv("CHAT_RATE_MAX", 10);

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export function consume(
  key: string,
  max: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const entry = STORE.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    STORE.set(key, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, resetAt };
  }

  if (entry.count >= max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

/**
 * Chave do rate limit do /api/chat — endpoint PUBLICO e anonimo que gasta a
 * OPENAI_API_KEY. Le o IP do ultimo salto confiavel por `trustedClientIp`.
 *
 * Ate 2026-09-20 esta funcao usava o primeiro elemento de `x-forwarded-for`,
 * que e exatamente o pedaco que o cliente escreve: um cabecalho novo por
 * requisicao dava um balde novo por requisicao, e o teto nao segurava nada.
 * Era a terceira copia do mesmo defeito (login e MCP eram as outras duas);
 * as tres agora passam pelo mesmo helper, para haver um so lugar onde errar.
 */
export function clientKey(request: Request): string {
  return trustedClientIp(request);
}
