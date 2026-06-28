import { SYSTEM_PROMPT } from "@/lib/chat-system-prompt";
import { clientKey, consume } from "@/lib/rate-limit";
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
  const limit = consume(clientKey(request));
  if (!limit.ok) {
    return Response.json(
      {
        error: "rate_limited",
        retryAt: limit.resetAt,
      },
      { status: 429, headers: { "Retry-After": "3600" } }
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("replace-me")) {
    return new Response(mockStream(messages), {
      headers: streamHeaders(),
    });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // RAG: pull the most relevant slices of Marco's CV/dossiers for this question.
  const lastUser =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const context = formatContext(await retrieve(lastUser, { k: 6, apiKey }));
  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\n# Retrieved context\nThe excerpts below come from Marco's CV and project dossiers. Ground your answer in them and name the relevant project, metric or tech. If the answer is not in this context or the brief above, say you are not sure and point to the contact form — never invent.\n\n${context}`
    : SYSTEM_PROMPT;

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
    return Response.json(
      { error: "upstream_failed", status: upstream.status },
      { status: 502 }
    );
  }

  return new Response(toClientStream(upstream.body), {
    headers: streamHeaders(),
  });
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

/**
 * Translates OpenAI's SSE format (`data: { ... }`) into the simpler
 * { event: 'chunk' | 'done' } shape the client expects.
 */
function toClientStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let buffer = "";

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
              if (delta) controller.enqueue(sse("chunk", { delta }));
            } catch {
              /* ignore malformed line */
            }
          }
        }
      } catch (err) {
        controller.enqueue(
          sse("error", { message: err instanceof Error ? err.message : "stream_error" })
        );
      } finally {
        controller.enqueue(sse("done", {}));
        controller.close();
      }
    },
  });
}

function mockStream(messages: ClientMessage[]): ReadableStream<Uint8Array> {
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
