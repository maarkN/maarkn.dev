"use client";

import { useCallback, useRef, useState } from "react";

export type ChatRole = "user" | "assistant";

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

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            messages: [
              ...messages.filter((m) => m.content),
              { role: "user" as const, content: trimmed },
            ].map(({ role, content }) => ({ role, content })),
            locale: opts.locale,
          }),
        });

        if (res.status === 429) {
          setStatus("rate_limited");
          return;
        }
        if (!res.ok || !res.body) {
          setStatus("error");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const ev = parseEvent(block);
            if (!ev) continue;
            if (ev.event === "chunk" && ev.data?.delta) {
              assistantContent += ev.data.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: assistantContent } : m
                )
              );
            } else if (ev.event === "error") {
              setStatus("error");
            }
          }
        }

        setStatus("idle");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
      }
    },
    [messages, status]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  return { messages, status, send, stop, reset };
}

function parseEvent(block: string): { event: string; data: { delta?: string } } | null {
  let event = "";
  let data: { delta?: string } | null = null;
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
