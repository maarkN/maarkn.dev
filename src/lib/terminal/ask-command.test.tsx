import { isValidElement, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import { R } from "@/components/terminal/primitives";
import type { TerminalLabels } from "@/components/terminal/types";
import {
  AskAnswer,
  CHAT_STATE_KEY,
  createAskCommand,
  createAskFallback,
  resetConversation,
} from "./ask-command";
import { createHistory } from "./history";
import { createRegistry, TERMINAL_ALIASES } from "./registry";
import { createRunner, type BaseContext, type Fallback, type RunnerIO } from "./run";
import { createSystemCommands, formatNotFound } from "./system-commands";
import type { OutputLine } from "./types";

const labels = en.terminal as unknown as TerminalLabels;
const ENCODER = new TextEncoder();
const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/* ── a fake /api/chat ──────────────────────────────────────────── */

type Reply =
  | { chunks: string[]; delayMs?: number }
  | { status: number; body?: unknown; headers?: Record<string, string> }
  | { throws: Error };

let replies: Reply[] = [];
let requests: { messages: { role: string; content: string }[]; locale: string }[] = [];

function respond(reply: Reply, signal: AbortSignal | null | undefined): Response {
  if ("throws" in reply) throw reply.throws;
  if ("status" in reply) {
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status,
      headers: { "Content-Type": "application/json", ...reply.headers },
    });
  }
  const { chunks, delayMs = 0 } = reply;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const delta of chunks) {
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        if (signal?.aborted) {
          const err = new Error("aborted");
          err.name = "AbortError";
          controller.error(err);
          return;
        }
        controller.enqueue(ENCODER.encode(sse("chunk", { delta })));
      }
      controller.enqueue(ENCODER.encode(sse("done", {})));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
  requests.push(JSON.parse(String(init?.body)));
  const reply = replies.shift();
  if (!reply) throw new Error("no reply queued");
  return respond(reply, init?.signal);
});

beforeEach(() => {
  replies = [];
  requests = [];
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ── a screen that keeps the last line replaceable ─────────────── */

function setup({ fallback, extra = [] }: { fallback?: Fallback; extra?: OutputLine[] } = {}) {
  const screen: OutputLine[] = [...extra];
  const io: RunnerIO = {
    echo: (text) => screen.push(`$ ${text}`),
    print: (lines) => screen.push(...lines),
    printLine: (line) => screen.push(line),
    replaceLast: (line) => screen.splice(-1, 1, line),
    clear: () => screen.splice(0),
    markDone: () => {},
  };
  const state: Record<string, unknown> = {};
  const registry = createRegistry(
    [createAskCommand(labels), ...createSystemCommands(labels)],
    TERMINAL_ALIASES,
  );
  const runner = createRunner({
    registry,
    history: createHistory({ storage: null }),
    io,
    format: {
      notFound: (name) => formatNotFound(labels, name),
      failed: (name, error) => [`${name}: ${(error as Error).message}`],
    },
    fallback,
  });
  const base = { locale: "en", dict: labels, state } as BaseContext;
  return { screen, state, runner, run: (raw: string) => runner.run(raw, base) };
}

/** Plain text of an output line: strings, elements (deep) and AskAnswer's text. */
function text(line: OutputLine): string {
  if (typeof line === "string") return line;
  if (Array.isArray(line)) return line.map(text).join("");
  if (isValidElement(line)) {
    const el = line as ReactElement<{ text?: string; children?: OutputLine }>;
    if (el.type === AskAnswer) return el.props.text ?? "";
    return text(el.props.children ?? "");
  }
  return line == null ? "" : String(line);
}

const answer = (line: OutputLine) =>
  isValidElement(line) && line.type === AskAnswer
    ? (line as ReactElement<{ text: string; streaming?: boolean }>).props
    : null;

const last = (screen: OutputLine[]) => screen[screen.length - 1];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── tests ─────────────────────────────────────────────────────── */

describe("ask", () => {
  it("prints usage without a question", async () => {
    const { screen, run } = setup();
    await run("ask");
    expect(text(screen[1])).toBe("usage: ask <question> · e.g. ask what did you build with LLMs?");
    expect(text(screen[2])).toContain("ask --new");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("streams the reply into one line after a thinking indicator, then keeps it", async () => {
    replies.push({ chunks: ["Type", "Script", " and **Go**"], delayMs: 150 });
    const { screen, run } = setup();
    const done = run("ask what stack do you use?");
    await sleep(50);
    expect(text(last(screen))).toBe("thinking…");
    await sleep(150);
    expect(answer(last(screen))).toMatchObject({ text: "Type", streaming: true });
    await done;
    expect(screen).toHaveLength(2); // echo + the answer, repainted in place
    expect(answer(last(screen))).toMatchObject({ text: "TypeScript and **Go**", streaming: false });
    expect(requests[0]).toEqual({
      messages: [{ role: "user", content: "what stack do you use?" }],
      locale: "en",
    });
  });

  it("keeps the conversation for follow-ups and forgets it on --new and clear", async () => {
    replies.push({ chunks: ["I built the Miami assistant."] });
    replies.push({ chunks: ["I was the only engineer."] });
    replies.push({ chunks: ["Fresh start."] });
    replies.push({ chunks: ["Again."] });
    const { screen, state, run } = setup();

    await run("ask tell me about a project");
    await run("ask and what was your role there?");
    expect(requests[1].messages).toEqual([
      { role: "user", content: "tell me about a project" },
      { role: "assistant", content: "I built the Miami assistant." },
      { role: "user", content: "and what was your role there?" },
    ]);

    await run("ask --new");
    expect(text(last(screen))).toBe("new conversation · previous context forgotten");
    expect(state[CHAT_STATE_KEY]).toBeUndefined();

    await run("ask --new start over");
    expect(requests[2].messages).toEqual([{ role: "user", content: "start over" }]);

    resetConversation(state); // what the host does on `clear` / Ctrl+L
    await run("ask again?");
    expect(requests[3].messages).toEqual([{ role: "user", content: "again?" }]);
  });

  it("aborts the request on Ctrl+C and keeps the partial text", async () => {
    replies.push({ chunks: ["one", " two", " three", " four"], delayMs: 100 });
    const { screen, runner, run } = setup();
    const done = run("ask count for me");
    await sleep(280);
    const signal = (fetchMock.mock.calls[0][1] as RequestInit).signal!;
    expect(signal.aborted).toBe(false);
    runner.abort();
    expect(signal.aborted).toBe(true);
    await done;
    const partial = answer(last(screen));
    expect(partial?.text).toMatch(/^one two( three)?$/);
    expect(screen).toHaveLength(2);
  });

  it("explains a rate limit with the cap and the retry time, in red", async () => {
    // Always in the future, whatever the wall clock says when the suite runs.
    const retryAt = new Date(Date.now() + 3600_000);
    const minutes = String(retryAt.getMinutes()).padStart(2, "0");
    replies.push({
      status: 429,
      body: { error: "rate_limited", reason: "per_ip", retryAt: retryAt.getTime() },
      headers: {
        "Retry-After": "3600",
        "X-RateLimit-Limit": "10",
        "X-RateLimit-Window": "3600",
      },
    });
    const { screen, run } = setup();
    await run("ask one too many");
    const line = last(screen);
    expect(text(line)).toMatch(
      new RegExp(`^rate limit: 10 messages/hour · try again at \\d{1,2}:${minutes}`),
    );
    expect(isValidElement(line) && line.type).toBe(R);
    expect(screen).toHaveLength(2);
  });

  it("suggests direct contact when the request fails", async () => {
    replies.push({ throws: new TypeError("Failed to fetch") });
    replies.push({ status: 502, body: { error: "upstream_failed" } });
    const { screen, run } = setup();
    await run("ask are you there?");
    expect(text(last(screen))).toBe(
      "couldn't reach the assistant · try again in a moment, or reach me directly via contact",
    );
    await run("ask and now?");
    expect(text(last(screen))).toBe(
      "the assistant is unavailable right now · try again in a moment, or reach me directly via contact",
    );
    // A failed turn is not remembered, so the visitor can simply retry.
    expect(requests[1].messages).toEqual([{ role: "user", content: "and now?" }]);
  });

  it("refuses slash-prefixed questions instead of forwarding them", async () => {
    const { screen, run } = setup();
    await run("ask /help");
    expect(text(last(screen))).toBe("ask: no slash commands here · type help");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("unknown-input fallback", () => {
  it("is off by default: unknown input is a plain command not found", async () => {
    const { screen, run } = setup({ fallback: createAskFallback(labels) });
    await run("how do you handle multitenancy");
    expect(text(last(screen))).toBe("bash: how: command not found · type help");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("when enabled, forwards sentences of three words or more to the assistant", async () => {
    replies.push({ chunks: ["Row-level security."] });
    const { screen, run } = setup({ fallback: createAskFallback(labels, () => true) });
    await run("how do you handle multitenancy");
    expect(text(screen[1])).toBe("bash: how: command not found · asking the assistant instead");
    expect(answer(last(screen))?.text).toBe("Row-level security.");
    expect(requests[0].messages).toEqual([
      { role: "user", content: "how do you handle multitenancy" },
    ]);
  });

  it("never forwards short input or slash commands", async () => {
    const { screen, run } = setup({ fallback: createAskFallback(labels, () => true) });
    await run("foo bar");
    expect(text(last(screen))).toBe("bash: foo: command not found · type help");
    await run("/help me out please");
    expect(text(last(screen))).toBe("bash: /help: command not found · type help");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the old slash commands as registry commands", () => {
  it("lists ping, git, pwd and hack under also try, and /help is not found", async () => {
    const { screen, run } = setup();
    await run("help");
    const alsoTry = screen.map(text).find((l) => l.startsWith("also try:"))!;
    for (const name of ["ping", "git", "pwd", "hack"]) expect(alsoTry).toContain(name);
    const listed = screen.map(text).join("\n");
    expect(listed).toContain("ask");
    await run("/help");
    expect(text(last(screen))).toBe("bash: /help: command not found · type help");
    await run("pwd");
    expect(text(last(screen))).toBe("/home/maarkn");
  });
});
