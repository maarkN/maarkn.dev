/*
 * Browser client for `/api/chat`, with no UI attached: it posts the
 * conversation, reads the SSE stream and reports tokens as they arrive.
 * Used by the terminal's `ask` command and by the (legacy) chat panel hook.
 */

export type ChatRole = "user" | "assistant";

export type ChatTurn = { role: ChatRole; content: string };

export type ChatErrorKind =
  /** 429 from the endpoint: the visitor or the site hit the message cap. */
  | "rate_limited"
  /** Any other non-2xx response (upstream provider failed, bad request…). */
  | "http"
  /** `fetch` itself failed: offline, DNS, CORS, connection reset. */
  | "network"
  /** The stream reported an error event mid-way; `text` holds what arrived. */
  | "stream";

export type RateLimitInfo = {
  /** Epoch milliseconds when the visitor may try again. */
  retryAt: number;
  /** Messages allowed per window, when the endpoint said so. */
  limit?: number;
  /** Window length in seconds, when the endpoint said so. */
  windowSeconds?: number;
  /** Which cap was hit, when the endpoint said so. */
  reason?: "per_ip" | "daily";
};

export class ChatError extends Error {
  readonly kind: ChatErrorKind;
  readonly status?: number;
  readonly rateLimit?: RateLimitInfo;

  constructor(
    kind: ChatErrorKind,
    message: string,
    extra: { status?: number; rateLimit?: RateLimitInfo } = {},
  ) {
    super(message);
    this.name = "ChatError";
    this.kind = kind;
    this.status = extra.status;
    this.rateLimit = extra.rateLimit;
  }
}

export type StreamChatOptions = {
  /** Whole conversation so far, the new question last. */
  messages: readonly ChatTurn[];
  locale: string;
  /** Aborting it cancels the request; the promise then resolves `aborted`. */
  signal?: AbortSignal;
  /** Every token, with the text accumulated so far. */
  onToken?: (delta: string, text: string) => void;
  /** The stream finished normally. */
  onDone?: (text: string) => void;
  /** The request or the stream failed (never called for an abort). */
  onError?: (error: ChatError) => void;
  /** Overrides for tests. */
  fetch?: typeof fetch;
  endpoint?: string;
};

export type StreamChatResult =
  | { status: "done"; text: string }
  | { status: "aborted"; text: string }
  | { status: "error"; text: string; error: ChatError };

export const CHAT_ENDPOINT = "/api/chat";

/**
 * Streams one assistant reply. Resolves when the stream ends, is aborted or
 * fails; it never rejects. `text` is always whatever was received so far.
 */
export async function streamChat({
  messages,
  locale,
  signal,
  onToken,
  onDone,
  onError,
  fetch: doFetch = globalThis.fetch,
  endpoint = CHAT_ENDPOINT,
}: StreamChatOptions): Promise<StreamChatResult> {
  let text = "";

  const fail = (error: ChatError): StreamChatResult => {
    onError?.(error);
    return { status: "error", text, error };
  };

  if (signal?.aborted) return { status: "aborted", text };

  let res: Response;
  try {
    res = await doFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        messages: messages
          .filter((m) => m.content.trim())
          .map(({ role, content }) => ({ role, content })),
        locale,
      }),
    });
  } catch (err) {
    if (isAbort(err, signal)) return { status: "aborted", text };
    return fail(new ChatError("network", errorMessage(err)));
  }

  if (res.status === 429) {
    return fail(
      new ChatError("rate_limited", "rate limited", {
        status: 429,
        rateLimit: await readRateLimit(res),
      }),
    );
  }
  if (!res.ok || !res.body) {
    return fail(new ChatError("http", `request failed (${res.status})`, { status: res.status }));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamError: ChatError | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        const ev = parseEvent(block);
        if (!ev) continue;
        if (ev.event === "chunk" && ev.data.delta) {
          text += ev.data.delta;
          onToken?.(ev.data.delta, text);
        } else if (ev.event === "error") {
          streamError = new ChatError("stream", ev.data.message ?? "stream error");
        }
      }
    }
  } catch (err) {
    if (isAbort(err, signal)) return { status: "aborted", text };
    return fail(new ChatError("network", errorMessage(err)));
  }

  if (signal?.aborted) return { status: "aborted", text };
  if (streamError) return fail(streamError);

  onDone?.(text);
  return { status: "done", text };
}

/* ── helpers ───────────────────────────────────────────────────── */

function isAbort(err: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (err instanceof Error && err.name === "AbortError");
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

type SseEvent = { event: string; data: { delta?: string; message?: string } };

function parseEvent(block: string): SseEvent | null {
  let event = "";
  let data: SseEvent["data"] | null = null;
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) {
      try {
        data = JSON.parse(line.slice(5).trim());
      } catch {
        return null;
      }
    }
  }
  return event ? { event, data: data ?? {} } : null;
}

/**
 * Rate-limit details from a 429: the headers the endpoint sets
 * (`Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Window`) with the JSON
 * body (`retryAt`, `reason`) as a fallback.
 */
async function readRateLimit(res: Response): Promise<RateLimitInfo> {
  const now = Date.now();
  const retryAfter = Number(res.headers.get("Retry-After"));
  const limit = Number(res.headers.get("X-RateLimit-Limit"));
  const windowSeconds = Number(res.headers.get("X-RateLimit-Window"));

  let body: { retryAt?: unknown; reason?: unknown } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    /* no body, or not JSON */
  }

  const retryAt =
    Number.isFinite(retryAfter) && retryAfter > 0
      ? now + retryAfter * 1000
      : typeof body.retryAt === "number"
        ? body.retryAt
        : now + 60 * 60 * 1000;

  return {
    retryAt,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    windowSeconds: Number.isFinite(windowSeconds) && windowSeconds > 0 ? windowSeconds : undefined,
    reason: body.reason === "per_ip" || body.reason === "daily" ? body.reason : undefined,
  };
}
