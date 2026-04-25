"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, RotateCcw, Sparkles, Square } from "lucide-react";
import { useChatStream, type ChatMessage } from "./use-chat-stream";
import { runSlashCommand } from "./slash-commands";
import { cn } from "@/lib/utils";

export type ChatLabels = {
  title: string;
  subtitle: string;
  empty: string;
  placeholder: string;
  send: string;
  stop: string;
  reset: string;
  rateLimited: string;
  errored: string;
  suggestions: string[];
  poweredBy: string;
};

export function ChatPanel({
  labels,
  locale,
  variant = "page",
}: {
  labels: ChatLabels;
  locale: string;
  variant?: "page" | "floating";
}) {
  const { messages, status, send, stop, reset, injectLocal } = useChatStream();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const dispatch = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const local = runSlashCommand(text);
    if (local !== null) {
      injectLocal(text, local);
      return;
    }
    void send(text, { locale });
  };

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, status]);

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || status === "streaming") return;
    dispatch(draft);
    setDraft("");
  };

  const empty = messages.length === 0;

  return (
    <div
      className={cn(
        "flex flex-col border border-[var(--border)] bg-[var(--surface)]",
        variant === "page" ? "h-[min(76vh,720px)]" : "h-[560px] max-h-[80vh]"
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" strokeWidth={2.2} />
          <div>
            <p className="font-display text-[12px] font-semibold tracking-tight text-[var(--text)]">
              {labels.title}
              <span className="dev-caret">▮</span>
            </p>
            <p className="font-mono text-[10px] tracking-[0.04em] text-[var(--muted)]">
              {labels.subtitle}
            </p>
          </div>
        </div>
        {!empty ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 border border-[var(--border)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={2.2} />
            {labels.reset}
          </button>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-6"
        aria-live="polite"
      >
        {empty ? (
          <div className="flex h-full flex-col items-start justify-end gap-5">
            <p className="max-w-md font-light leading-[1.7] text-[var(--text-2)]">
              {labels.empty}
            </p>
            <ul className="flex flex-wrap gap-2">
              {labels.suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft("");
                      dispatch(s);
                    }}
                    disabled={status === "streaming"}
                    className="border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-[11px] tracking-[0.02em] text-[var(--text-2)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="flex flex-col gap-5">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} streaming={status === "streaming"} />
            ))}
            {status === "rate_limited" ? (
              <li>
                <Notice tone="warn">{labels.rateLimited}</Notice>
              </li>
            ) : null}
            {status === "error" ? (
              <li>
                <Notice tone="error">{labels.errored}</Notice>
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-[var(--border)] bg-[var(--surface-2)] p-3"
      >
        <div className="flex items-end gap-2 border border-[var(--border)] bg-[var(--surface)] px-3 py-2 focus-within:border-[var(--accent)]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder={labels.placeholder}
            rows={1}
            className="min-h-[24px] max-h-40 flex-1 resize-none bg-transparent font-sans text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
          />
          {status === "streaming" ? (
            <button
              type="button"
              onClick={stop}
              aria-label={labels.stop}
              className="inline-flex h-9 w-9 items-center justify-center border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Square className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label={labels.send}
              className="inline-flex h-9 w-9 items-center justify-center border border-[var(--accent)] bg-[var(--accent)] text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 font-mono text-[10px] tracking-[0.04em] text-[var(--muted)]">
          {labels.poweredBy}
        </p>
      </form>
    </div>
  );
}

function Bubble({ message, streaming }: { message: ChatMessage; streaming: boolean }) {
  const isUser = message.role === "user";
  const isStreamingThisAssistant =
    !isUser && streaming && message.content.length === 0;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-wrap break-words border px-3.5 py-2.5 text-[14px] leading-[1.6]",
          isUser
            ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)]"
            : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)]"
        )}
      >
        {message.content}
        {isStreamingThisAssistant ? (
          <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[var(--accent)] align-middle" />
        ) : null}
        {!isUser && !isStreamingThisAssistant && streaming ? (
          <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[var(--accent)] align-middle" />
        ) : null}
      </div>
    </motion.li>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "warn" | "error";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border px-3 py-2 font-mono text-[11px] tracking-[0.02em]",
        tone === "warn"
          ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
          : "border-[var(--red)]/50 bg-[var(--red)]/10 text-[var(--red)]"
      )}
    >
      {children}
    </div>
  );
}
