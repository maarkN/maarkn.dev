/**
 * `ChatLog.status`, from `src/lib/chat-log.ts`: a row is written as `pending`
 * before the stream starts and set to `ok` | `mock` | `error` when it ends, so
 * `pending` means the stream never finished. The words are in the dictionary
 * (`admin.vocab.chatStatus`).
 */

export const CHAT_STATUSES = ["ok", "mock", "pending", "error"] as const;
export type ChatStatus = (typeof CHAT_STATUSES)[number];

export function isChatStatus(value: string): value is ChatStatus {
  return (CHAT_STATUSES as readonly string[]).includes(value);
}

/** The colour of the mark next to the word: a second channel, never the only one. */
export const CHAT_STATUS_TONES: Record<ChatStatus, string> = {
  ok: "bg-ok",
  mock: "bg-ink-3",
  pending: "bg-warn",
  error: "bg-destructive",
};
