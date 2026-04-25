"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";

const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

const ASCII = String.raw`                                  _
   _ __ ___   __ _  __ _ _ __| | ___ __
  | '_ \` _ \ / _\` |/ _\` | '__| |/ / '_ \
  | | | | | | (_| | (_| | |  |   <| | | |
  |_| |_| |_|\__,_|\__,_|_|  |_|\_\_| |_|`;

/**
 * Easter Egg #1 — Konami sequence. Tracks key presses globally,
 * forces the dev theme, fires the glitch overlay, and opens a
 * terminal modal with ASCII art and contact info.
 */
export function KonamiEgg() {
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const positionRef = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const expected = SEQUENCE[positionRef.current];
      if (!expected) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === expected) {
        positionRef.current += 1;
        if (positionRef.current === SEQUENCE.length) {
          positionRef.current = 0;
          setTheme("dev");
          setGlitching(true);
          setOpen(true);
          window.setTimeout(() => setGlitching(false), 1300);
        }
      } else {
        positionRef.current = key === SEQUENCE[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTheme]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <span
        className={"dev-konami-overlay" + (glitching ? " is-active" : "")}
        aria-hidden
      />
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/85 backdrop-blur-sm px-4"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-label="Konami terminal"
          >
            <motion.div
              initial={{ y: 16, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 16, scale: 0.96 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="dev-terminal"
            >
              <div className="dev-terminal-head">
                maarkn@dev:~$ — SYS_ROOT — bash -i
              </div>
              <pre className="dev-terminal-body">
                <span className="dim">{`> running ./access.sh --user=guest\n`}</span>
                <span className="bright">{`✔ access granted\n\n`}</span>
                <span className="cmd">{ASCII}</span>
                <br />
                <br />
                <span className="dim">{`╭─ stack ─────────────────────────────────────────╮\n`}</span>
                {`│ TypeScript · NestJS · Next.js · React · Flutter │\n`}
                {`│ PostgreSQL · MongoDB · Redis · Kafka · AWS      │\n`}
                {`│ Docker · GCP · Microservices · Domain-Driven    │\n`}
                <span className="dim">{`╰─────────────────────────────────────────────────╯\n\n`}</span>
                <span className="bright">{`current_role:`}</span>{" "}Senior Fullstack Engineer
                <br />
                <span className="bright">{`location:    `}</span>{" "}Goiânia, BR — open to relocate
                <br />
                <span className="bright">{`status:      `}</span>{" "}<span className="warn">OPEN_TO_WORK</span>
                <br />
                <br />
                <span className="dim">{`reach out:\n`}</span>
                {`  email     `}<span className="cmd">markimkr@gmail.com</span>
                <br />
                {`  linkedin  `}<span className="cmd">linkedin.com/in/maarkn</span>
                <br />
                {`  whatsapp  `}<span className="cmd">+55 62 98173 6748</span>
                <br />
                <br />
                <span className="dim">{`hint: try /help in the chat for more terminal toys.\n`}</span>
                <span className="bright">{`maarkn@dev:~$ `}</span>
                <span style={{ animation: "dev-blink 1s step-end infinite" }}>▮</span>
              </pre>
              <button
                type="button"
                className="dev-terminal-close"
                onClick={() => setOpen(false)}
              >
                [ exit ]
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
