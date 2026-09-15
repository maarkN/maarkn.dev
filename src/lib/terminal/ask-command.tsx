/* eslint-disable react/jsx-key -- every OutputLine is rendered on its own
   inside <Line>, never as a React child array, so keys are meaningless here. */
import dynamic from "next/dynamic";
import { useMemo, useSyncExternalStore } from "react";
import { Cmd, D, R } from "@/components/terminal/primitives";
import s from "@/components/terminal/terminal.module.css";
import type { TerminalLabels } from "@/components/terminal/types";
import { streamChat, type ChatError, type ChatTurn } from "@/lib/chat-client";
import { tokenize } from "./parse";
import { rich } from "./rich";
import type { Fallback } from "./run";
import type { Command, OutputLine } from "./types";

/*
 * `ask <question>`: the site's RAG assistant inside the terminal. The reply
 * streams into a single output line that is repainted as tokens arrive
 * (`ctx.replaceLast`, throttled), the conversation lives in `ctx.state` for
 * the session, and `Ctrl+C` aborts through `ctx.signal`. The backend is the
 * same `/api/chat` the old panel used: rate limit, logging and the offline
 * mock replies all still apply.
 */

/** Key of the conversation inside `ctx.state`. */
export const CHAT_STATE_KEY = "chat";

/** Minimum time between two repaints of the streaming answer. */
export const REPAINT_MS = 32;

/** Unknown input needs at least this many words to be forwarded to the assistant. */
export const FALLBACK_MIN_WORDS = 3;

type ChatState = { messages: ChatTurn[] };

function conversation(state: Record<string, unknown>): ChatState {
  const existing = state[CHAT_STATE_KEY] as ChatState | undefined;
  if (existing) return existing;
  const fresh: ChatState = { messages: [] };
  state[CHAT_STATE_KEY] = fresh;
  return fresh;
}

/** Forgets the session's conversation (`ask --new`, `clear`, Ctrl+L). */
export function resetConversation(state: Record<string, unknown>): void {
  delete state[CHAT_STATE_KEY];
}

/* ── output ────────────────────────────────────────────────────── */

// Only visitors who ask pay for the markdown renderer.
const Markdown = dynamic(() => import("@/components/terminal/markdown"), {
  ssr: false,
  loading: () => null,
});
const preloadMarkdown = () => void import("@/components/terminal/markdown");

const noop = () => () => {};

/**
 * The assistant's reply as one output line. While `streaming` a cursor
 * blinks below the text; it also goes away when `signal` aborts, since the
 * command can no longer repaint the line after Ctrl+C.
 */
export function AskAnswer({
  text,
  streaming = false,
  signal,
}: {
  text: string;
  streaming?: boolean;
  signal?: AbortSignal;
}) {
  const subscribe = useMemo(
    () =>
      signal
        ? (notify: () => void) => {
            signal.addEventListener("abort", notify);
            return () => signal.removeEventListener("abort", notify);
          }
        : noop,
    [signal],
  );
  const aborted = useSyncExternalStore(
    subscribe,
    () => signal?.aborted ?? false,
    () => false,
  );
  return (
    <>
      <Markdown text={text} />
      {streaming && !aborted ? <span className={s.askCursor} aria-hidden="true" /> : null}
    </>
  );
}

/** `HH:mm` (locale-formatted) of an epoch timestamp. */
function timeOf(locale: string, epochMs: number): string {
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
      new Date(epochMs),
    );
  } catch {
    return new Date(epochMs).toTimeString().slice(0, 5);
  }
}

/* ── command ───────────────────────────────────────────────────── */

export function createAskCommand(labels: TerminalLabels): Command {
  const t = labels.ask;
  const { messages } = labels;

  const contactHint = (
    <D>{rich(t.contactHint, { contact: <Cmd>contact</Cmd> })}</D>
  );

  function formatError(error: ChatError, locale: string): OutputLine {
    if (error.kind === "rate_limited") {
      const info = error.rateLimit;
      const seconds = info?.windowSeconds ?? (info?.reason === "daily" ? 86_400 : 3_600);
      const window =
        seconds >= 86_400
          ? t.windowDay
          : seconds >= 3_600
            ? t.windowHour
            : rich(t.windowMinutes, { n: String(Math.max(1, Math.round(seconds / 60))) });
      return (
        <R>
          {rich(t.rateLimit, {
            limit: String(info?.limit ?? "…"),
            window,
            time: timeOf(locale, info?.retryAt ?? Date.now()),
          })}
        </R>
      );
    }
    return (
      <>
        <R>{error.kind === "network" ? t.networkError : t.unavailable}</R> {contactHint}
      </>
    );
  }

  return {
    name: "ask",
    usage: "ask <question>",
    describe: labels.help.describe.ask ?? "ask",
    run: async (args, ctx) => {
      let words = args;
      let fresh = false;
      if (words[0] === "--new" || words[0] === "-n") {
        fresh = true;
        words = words.slice(1);
        resetConversation(ctx.state);
      }
      const question = words.join(" ").trim();

      if (!question) {
        if (fresh) return [<D>{t.newConversation}</D>];
        return [
          <>
            {t.usage} <D>{t.example}</D>
          </>,
          <D>{rich(t.newHint)}</D>,
        ];
      }
      if (question.startsWith("/")) {
        return [
          <>
            {t.noSlash} <D>{rich(messages.typeHelp)}</D>
          </>,
        ];
      }

      preloadMarkdown();
      const chat = conversation(ctx.state);
      const turns: ChatTurn[] = [...chat.messages, { role: "user", content: question }];

      ctx.print(
        <>
          <D>{t.thinking}</D>
          <span className={s.askCursor} aria-hidden="true" />
        </>,
      );

      // Repaint at most every REPAINT_MS: a re-render per token would be wasteful.
      let painted = 0;
      let pending: string | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const paint = (text: string, streaming: boolean) => {
        painted = Date.now();
        ctx.replaceLast(<AskAnswer text={text} streaming={streaming} signal={ctx.signal} />);
      };
      const schedule = (text: string) => {
        pending = text;
        if (timer) return;
        const wait = Math.max(0, REPAINT_MS - (Date.now() - painted));
        timer = setTimeout(() => {
          timer = null;
          if (pending !== null) paint(pending, true);
          pending = null;
        }, wait);
      };
      const settle = () => {
        if (timer) clearTimeout(timer);
        timer = null;
        pending = null;
      };

      const result = await streamChat({
        messages: turns,
        locale: ctx.locale,
        signal: ctx.signal,
        onToken: (_, text) => schedule(text),
      });
      settle();

      if (result.status === "aborted") {
        // What arrived stays on screen (the runner ignores output past the
        // abort) and in the context, so a follow-up still makes sense.
        if (result.text) {
          chat.messages.push({ role: "user", content: question });
          chat.messages.push({ role: "assistant", content: result.text });
        }
        return null;
      }

      if (result.status === "error") {
        const line = formatError(result.error, ctx.locale);
        if (!result.text) {
          ctx.replaceLast(line);
          return null;
        }
        paint(result.text, false);
        return [line];
      }

      paint(result.text, false);
      chat.messages.push({ role: "user", content: question });
      chat.messages.push({ role: "assistant", content: result.text });
      return null;
    },
  };
}

/* ── unknown-command fallback ──────────────────────────────────── */

const fallbackEnabled = () => process.env.NEXT_PUBLIC_TERMINAL_ASK_FALLBACK === "true";

/**
 * When `NEXT_PUBLIC_TERMINAL_ASK_FALLBACK=true`, input that resolves to no
 * command but reads like a sentence (three words or more, not a `/slash`)
 * is handed to `ask` after a notice. Off by default so typos never spend
 * the assistant's quota. `enabled` is read on every call.
 */
export function createAskFallback(
  labels: TerminalLabels,
  enabled: () => boolean = fallbackEnabled,
): Fallback {
  return (text) => {
    if (!enabled() || text.startsWith("/")) return null;
    const words = tokenize(text);
    if (words.length < FALLBACK_MIN_WORDS) return null;
    return {
      line: `ask ${text}`,
      notice: [
        <>
          bash: {words[0]}: {labels.messages.notFound} <D>{labels.ask.forwarded}</D>
        </>,
      ],
    };
  };
}
