import { describe, expect, it, vi } from "vitest";
import { ChatError, streamChat, type ChatTurn } from "./chat-client";

const ENCODER = new TextEncoder();

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** A `/api/chat`-shaped SSE response that emits `chunks` with a delay between them. */
function sseResponse(chunks: string[], { delayMs = 0, error }: { delayMs?: number; error?: string } = {}) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const delta of chunks) {
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        controller.enqueue(ENCODER.encode(sse("chunk", { delta })));
      }
      if (error) controller.enqueue(ENCODER.encode(sse("error", { message: error })));
      controller.enqueue(ENCODER.encode(sse("done", {})));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

/** A fetch mock that honours the abort signal like the real one. */
function fetchWith(make: (init: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const signal = init?.signal;
    if (signal?.aborted) throw abortError();
    const res = await make(init ?? {});
    if (!signal || !res.body) return res;
    // Reading past an abort must throw, as the platform's fetch does.
    const reader = res.body.getReader();
    const guarded = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (signal.aborted) {
          controller.error(abortError());
          return;
        }
        if (done) controller.close();
        else controller.enqueue(value);
      },
    });
    return new Response(guarded, { status: res.status, headers: res.headers });
  }) as unknown as typeof fetch;
}

function abortError() {
  const err = new Error("The operation was aborted.");
  err.name = "AbortError";
  return err;
}

const question: ChatTurn[] = [{ role: "user", content: "what stack do you use?" }];

describe("streamChat", () => {
  it("posts the conversation and reports every token, then done", async () => {
    const fetch = fetchWith(() => sseResponse(["Type", "Script", " and", " Go"]));
    const tokens: string[] = [];
    const onDone = vi.fn();
    const onError = vi.fn();

    const result = await streamChat({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
        { role: "user", content: "  " },
        ...question,
      ],
      locale: "en",
      fetch,
      onToken: (delta) => tokens.push(delta),
      onDone,
      onError,
    });

    expect(tokens).toEqual(["Type", "Script", " and", " Go"]);
    expect(result).toEqual({ status: "done", text: "TypeScript and Go" });
    expect(onDone).toHaveBeenCalledWith("TypeScript and Go");
    expect(onError).not.toHaveBeenCalled();

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(init.method).toBe("POST");
    // Blank turns are dropped; ids and anything else never reach the wire.
    expect(JSON.parse(init.body)).toEqual({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
        { role: "user", content: "what stack do you use?" },
      ],
      locale: "en",
    });
  });

  it("reassembles events split across reads", async () => {
    const payload = sse("chunk", { delta: "he" }) + sse("chunk", { delta: "llo" });
    const bytes = ENCODER.encode(payload);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Cut in the middle of the second event's data line.
        controller.enqueue(bytes.slice(0, 40));
        controller.enqueue(bytes.slice(40));
        controller.close();
      },
    });
    const fetch = fetchWith(() => new Response(stream));
    const result = await streamChat({ messages: question, locale: "en", fetch });
    expect(result).toEqual({ status: "done", text: "hello" });
  });

  it("propagates an abort: stops, keeps the partial text and never reports an error", async () => {
    const fetch = fetchWith(() => sseResponse(["one", " two", " three", " four"], { delayMs: 15 }));
    const ac = new AbortController();
    const onDone = vi.fn();
    const onError = vi.fn();

    const result = await streamChat({
      messages: question,
      locale: "en",
      signal: ac.signal,
      fetch,
      onToken: (_, text) => {
        if (text === "one two") ac.abort();
      },
      onDone,
      onError,
    });

    expect(result).toEqual({ status: "aborted", text: "one two" });
    expect(onDone).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.signal).toBe(ac.signal);
  });

  it("resolves aborted without fetching when the signal is already aborted", async () => {
    const fetch = fetchWith(() => sseResponse(["x"]));
    const ac = new AbortController();
    ac.abort();
    const result = await streamChat({ messages: question, locale: "en", signal: ac.signal, fetch });
    expect(result).toEqual({ status: "aborted", text: "" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("turns a 429 into a rate_limited error with the endpoint's headers", async () => {
    const fetch = fetchWith(
      () =>
        new Response(JSON.stringify({ error: "rate_limited", reason: "per_ip", retryAt: 1 }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "120",
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Window": "3600",
          },
        }),
    );
    const onError = vi.fn();
    const before = Date.now();
    const result = await streamChat({ messages: question, locale: "en", fetch, onError });

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.error).toBeInstanceOf(ChatError);
    expect(result.error.kind).toBe("rate_limited");
    expect(result.error.status).toBe(429);
    expect(result.error.rateLimit?.limit).toBe(10);
    expect(result.error.rateLimit?.windowSeconds).toBe(3600);
    expect(result.error.rateLimit?.reason).toBe("per_ip");
    expect(result.error.rateLimit?.retryAt).toBeGreaterThanOrEqual(before + 120_000);
    expect(onError).toHaveBeenCalledWith(result.error);
  });

  it("reports other failures as http, network or stream errors", async () => {
    const http = await streamChat({
      messages: question,
      locale: "en",
      fetch: fetchWith(() => new Response("nope", { status: 502 })),
    });
    expect(http.status === "error" && http.error.kind).toBe("http");
    expect(http.status === "error" && http.error.status).toBe(502);

    const network = await streamChat({
      messages: question,
      locale: "en",
      fetch: fetchWith(() => {
        throw new TypeError("Failed to fetch");
      }),
    });
    expect(network.status === "error" && network.error.kind).toBe("network");

    const stream = await streamChat({
      messages: question,
      locale: "en",
      fetch: fetchWith(() => sseResponse(["partial"], { error: "upstream reset" })),
    });
    expect(stream).toMatchObject({ status: "error", text: "partial" });
    expect(stream.status === "error" && stream.error.kind).toBe("stream");
  });
});
