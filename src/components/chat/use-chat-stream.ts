"use client";

import { useCallback, useRef, useState } from "react";
import { streamChat, type ChatRole } from "@/lib/chat-client";

export type { ChatRole };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type ChatStatus = "idle" | "streaming" | "error" | "rate_limited";

export type SendOptions = { locale: string };

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * React state around `streamChat` for the chat panel: the message list, a
 * status flag and stop/reset controls. The network part lives in
 * `lib/chat-client.ts`, shared with the terminal's `ask` command.
 */
export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStatus("idle");
  }, []);

  const send = useCallback(
    async (prompt: string, opts: SendOptions) => {
      const trimmed = prompt.trim();
      if (!trimmed || status === "streaming") return;

      const userMsg: ChatMessage = { id: uid(), role: "user", content: trimmed };
      const assistantMsg: ChatMessage = { id: uid(), role: "assistant", content: "" };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStatus("streaming");

      const ac = new AbortController();
      abortRef.current = ac;

      const result = await streamChat({
        messages: [...messages, userMsg],
        locale: opts.locale,
        signal: ac.signal,
        onToken: (_, text) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: text } : m)),
          );
        },
      });

      if (result.status === "aborted") return;
      if (result.status === "error") {
        setStatus(result.error.kind === "rate_limited" ? "rate_limited" : "error");
        return;
      }
      setStatus("idle");
    },
    [messages, status],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  return { messages, status, send, stop, reset };
}
