import "server-only";
import { createHash } from "node:crypto";
import { db, dbConfigured } from "./db";

/**
 * Durable, DB-backed rate limiting + usage logging for the public chat.
 *
 * The `ChatLog` table is the single source of truth: every turn that reaches
 * the model is written here, and the limiter simply counts recent rows. That
 * makes the budget guard survive redeploys (unlike the in-memory fallback in
 * lib/rate-limit.ts) and doubles as the data behind the admin chat dashboard.
 *
 * Two guards run on every request:
 *   - per-visitor: at most PER_IP_MAX turns inside a sliding PER_IP_WINDOW.
 *   - global daily: at most DAILY_MAX turns per UTC day, across everyone — the
 *     real cap on token spend regardless of how many IPs show up.
 */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const PER_IP_MAX = intEnv("CHAT_RATE_MAX", 10);
const PER_IP_WINDOW_MS = intEnv("CHAT_RATE_WINDOW_MS", 60 * 60 * 1000); // 1h
const DAILY_MAX = intEnv("CHAT_DAILY_MAX", 300);

const DAY_MS = 24 * 60 * 60 * 1000;

/** sha256(ip) truncated — pseudonymous visitor id, so no raw IP is stored. */
export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

/** chars/4 is the usual rough proxy for OpenAI token counts. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export type ChatGate =
  | { ok: true }
  | { ok: false; reason: "per_ip" | "daily"; resetAt: number };

function startOfUtcDay(now: number): number {
  return Math.floor(now / DAY_MS) * DAY_MS;
}

/**
 * Returns whether this visitor may send another turn. Counts committed rows,
 * including `pending` ones, so in-flight requests still count against the cap.
 */
export async function checkChatGate(clientKeyHash: string): Promise<ChatGate> {
  if (!dbConfigured) return { ok: true };

  const now = Date.now();
  const dayStart = startOfUtcDay(now);

  try {
    const [perIp, daily] = await Promise.all([
      db.chatLog.count({
        where: {
          clientKeyHash,
          createdAt: { gte: new Date(now - PER_IP_WINDOW_MS) },
        },
      }),
      db.chatLog.count({
        where: { createdAt: { gte: new Date(dayStart) } },
      }),
    ]);

    if (daily >= DAILY_MAX) {
      return { ok: false, reason: "daily", resetAt: dayStart + DAY_MS };
    }
    if (perIp >= PER_IP_MAX) {
      return { ok: false, reason: "per_ip", resetAt: now + PER_IP_WINDOW_MS };
    }
    return { ok: true };
  } catch (err) {
    // Never let a DB hiccup take the chat down — fail open.
    console.error("[chat-log] gate check failed", err);
    return { ok: true };
  }
}

export type ChatStartInput = {
  clientKeyHash: string;
  locale: string;
  model: string;
  question: string;
  promptTokens: number;
};

/**
 * Records the turn as `pending` before streaming. Returns the row id to finish
 * later, or null when logging is unavailable (no DB / write failed) so callers
 * can degrade silently.
 */
export async function logChatStart(input: ChatStartInput): Promise<string | null> {
  if (!dbConfigured) return null;
  try {
    const row = await db.chatLog.create({
      data: {
        clientKeyHash: input.clientKeyHash,
        locale: input.locale,
        model: input.model,
        question: input.question,
        promptTokens: input.promptTokens,
        status: "pending",
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    console.error("[chat-log] start write failed", err);
    return null;
  }
}

export type ChatFinishInput = {
  answer: string;
  status: "ok" | "mock" | "error";
  answerTokens: number;
  latencyMs: number;
};

/** Fills in the answer + outcome once the stream ends. Fire-and-forget safe. */
export async function logChatFinish(
  id: string | null,
  input: ChatFinishInput
): Promise<void> {
  if (!id || !dbConfigured) return;
  try {
    await db.chatLog.update({
      where: { id },
      data: {
        answer: input.answer,
        status: input.status,
        answerTokens: input.answerTokens,
        latencyMs: input.latencyMs,
      },
    });
  } catch (err) {
    console.error("[chat-log] finish write failed", err);
  }
}

export const CHAT_LIMITS = {
  perIpMax: PER_IP_MAX,
  perIpWindowMs: PER_IP_WINDOW_MS,
  dailyMax: DAILY_MAX,
};
