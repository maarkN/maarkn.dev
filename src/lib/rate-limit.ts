/**
 * Tiny in-memory token-bucket-ish limiter, scoped to one node process.
 * Good enough for a single-instance deploy or local dev. Replace with a
 * Redis-backed implementation when the site goes multi-region.
 */

type Entry = { count: number; resetAt: number };

const STORE = new Map<string, Entry>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

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

export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
}
