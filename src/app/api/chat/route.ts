import { SYSTEM_PROMPT } from "@/lib/chat-system-prompt";
import { clientKey, consume } from "@/lib/rate-limit";
import {
  checkChatGate,
  estimateTokens,
  hashKey,
  logChatFinish,
  logChatStart,
  type ChatGate,
} from "@/lib/chat-log";
import { dbConfigured } from "@/lib/db";
import { retrieve, formatContext } from "@/lib/rag";

export const runtime = "nodejs";

const ENCODER = new TextEncoder();

type ClientMessage = { role: "user" | "assistant"; content: string };

type IncomingBody = {
  messages?: ClientMessage[];
  locale?: string;
};

const MAX_HISTORY = 12;
const MAX_MESSAGE_LEN = 2000;

function sse(event: string, data: unknown): Uint8Array {
  return ENCODER.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const rawKey = clientKey(request);
  const clientKeyHash = hashKey(rawKey);

  // Durable, DB-counted limiter when Postgres is up; in-memory fallback for
  // local dev / DB-less deploys so the endpoint is never left unprotected.
  const gate: ChatGate = dbConfigured
    ? await checkChatGate(clientKeyHash)
    : memGate(rawKey);
  if (!gate.ok) {
    return Response.json(
      { error: "rate_limited", reason: gate.reason, retryAt: gate.resetAt },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((gate.resetAt - Date.now()) / 1000))
          ),
        },
      }
    );
  }

  let body: IncomingBody;
  try {
    body = (await request.json()) as IncomingBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const messages = sanitize(body.messages ?? []);
  if (messages.length === 0) {
    return Response.json({ error: "empty" }, { status: 400 });
  }

  const locale =
    typeof body.locale === "string" ? body.locale.slice(0, 12) : "en";
  const question =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("replace-me")) {
    // Offline preview: no model call, so no real token spend to account for.
    const logId = await logChatStart({
      clientKeyHash,
      locale,
      model: "mock",
      question,
      promptTokens: 0,
    });
    const startedAt = Date.now();
    return new Response(
      mockStream(messages, (answer) =>
        logChatFinish(logId, {
          answer,
          status: "mock",
          answerTokens: 0,
          latencyMs: Date.now() - startedAt,
        })
      ),
      { headers: streamHeaders() }
    );
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // RAG: pull the most relevant slices of Marco's CV/dossiers for this question.
  const context = formatContext(await retrieve(question, { k: 6, apiKey }));
  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\n# Retrieved context\nThe excerpts below come from Marco's CV and project dossiers. Ground your answer in them and name the relevant project, metric or tech. If the answer is not in this context or the brief above, say you are not sure and point to the contact form — never invent.\n\n${context}`
    : SYSTEM_PROMPT;

  const promptTokens =
    estimateTokens(systemContent) +
    messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

  const logId = await logChatStart({
    clientKeyHash,
    locale,
    model,
    question,
    promptTokens,
  });
  const startedAt = Date.now();

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("[chat] openai upstream failed", upstream.status, detail);
    await logChatFinish(logId, {
      answer: "",
      status: "error",
      answerTokens: 0,
      latencyMs: Date.now() - startedAt,
    });
    return Response.json(
      { error: "upstream_failed", status: upstream.status },
      { status: 502 }
    );
  }

  return new Response(
    toClientStream(upstream.body, (answer, errored) =>
      logChatFinish(logId, {
        answer,
        status: errored ? "error" : "ok",
        answerTokens: estimateTokens(answer),
        latencyMs: Date.now() - startedAt,
      })
    ),
    { headers: streamHeaders() }
  );
}

/** Map the in-memory fallback limiter into the DB limiter's gate shape. */
function memGate(rawKey: string): ChatGate {
  const r = consume(rawKey);
  return r.ok ? { ok: true } : { ok: false, reason: "per_ip", resetAt: r.resetAt };
}

function streamHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };
}

function sanitize(messages: ClientMessage[]): ClientMessage[] {
  return messages
    .filter(
      (m): m is ClientMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_MESSAGE_LEN),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORY);
}

/** Called once a stream ends, with the full assistant text and whether it errored. */
type OnComplete = (answer: string, errored: boolean) => void | Promise<void>;

/**
 * Translates OpenAI's SSE format (`data: { ... }`) into the simpler
 * { event: 'chunk' | 'done' } shape the client expects, accumulating the full
 * reply so it can be persisted via `onComplete` when the stream finishes.
 */
function toClientStream(
  upstream: ReadableStream<Uint8Array>,
  onComplete: OnComplete
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let errored = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                answer += delta;
                controller.enqueue(sse("chunk", { delta }));
              }
            } catch {
              /* ignore malformed line */
            }
          }
        }
      } catch (err) {
        errored = true;
        controller.enqueue(
          sse("error", { message: err instanceof Error ? err.message : "stream_error" })
        );
      } finally {
        controller.enqueue(sse("done", {}));
        controller.close();
        await onComplete(answer, errored);
      }
    },
  });
}

function mockStream(
  messages: ClientMessage[],
  onComplete: OnComplete
): ReadableStream<Uint8Array> {
  const last = messages[messages.length - 1]?.content.toLowerCase() ?? "";
  const reply = pickMockReply(last);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const tokens = reply.split(/(\s+)/);
      for (const t of tokens) {
        if (!t) continue;
        controller.enqueue(sse("chunk", { delta: t }));
        await new Promise((r) => setTimeout(r, 30));
      }
      controller.enqueue(sse("done", {}));
      controller.close();
      await onComplete(reply, false);
    },
  });
}

function pickMockReply(prompt: string): string {
  if (/availab/.test(prompt) || /dispon/.test(prompt)) {
    return "Marco is currently open to new opportunities — both freelance and full-time. The fastest way to start a conversation is the contact form on this site or an email to markimkr@gmail.com.";
  }
  if (/stack|tech|technolog/.test(prompt)) {
    return "Marco's daily stack is TypeScript, Node.js, NestJS, Next.js and React, with PostgreSQL, MongoDB and Redis on the data side. He's also comfortable with Flutter, Astro and the usual cloud bits (Docker, AWS, GCP).";
  }
  if (/miami|real.?estate|imov/.test(prompt)) {
    return "He built a WhatsApp assistant for a Miami real-estate agency that captures and qualifies leads, syncs the property catalog from MLS, and walks visitors through neighborhood, price range and bedroom count without ever feeling like a form.";
  }
  return "I'm running in offline preview mode right now — no OpenAI key set on this deployment. Once a key is configured I'll pull richer answers from the live model. Meanwhile, you can read about Marco's work and reach him via the contact form or markimkr@gmail.com.";
}
