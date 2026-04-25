"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { ChatPanel, type ChatLabels } from "./chat-panel";
import { cn } from "@/lib/utils";

export function ChatLauncher({
  labels,
  locale,
  buttonLabel,
}: {
  labels: ChatLabels;
  locale: string;
  buttonLabel: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={buttonLabel}
        className={cn(
          "fixed bottom-4 right-4 z-50 inline-flex h-12 w-12 sm:w-auto items-center justify-center gap-2 border border-[var(--accent)] bg-[var(--accent)] sm:px-4 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_8px_28px_var(--accent-glow)] transition-transform hover:-translate-y-0.5",
          open && "translate-y-0"
        )}
      >
        {open ? (
          <X className="h-4 w-4" strokeWidth={2.4} />
        ) : (
          <MessageCircle className="h-4 w-4" strokeWidth={2} />
        )}
        <span className="hidden sm:inline">{buttonLabel}</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-4 bottom-20 z-40 sm:inset-x-auto sm:right-4 sm:w-[min(420px,calc(100vw-2rem))]"
          >
            <ChatPanel labels={labels} locale={locale} variant="floating" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
