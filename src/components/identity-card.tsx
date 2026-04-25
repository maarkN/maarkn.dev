"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ThemePhoto } from "./theme-photo";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

type CardLabels = {
  label: string;
  name: string;
  role: string;
  stats: { years: string; projects: string; stack: string; countries: string };
};

export function IdentityCard({ labels }: { labels: CardLabels }) {
  const { theme } = useTheme();
  const [flipped, setFlipped] = useState(false);
  const isDev = theme === "dev";

  const onCardClick = () => {
    if (!isDev) return;
    setFlipped((v) => !v);
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
      className="relative w-full max-w-[400px] mx-auto md:mx-0"
    >
      <div className="dev-flip-scene">
        <div
          className={cn("dev-flip-card", flipped && "is-flipped")}
          onClick={onCardClick}
          role={isDev ? "button" : undefined}
          aria-pressed={isDev ? flipped : undefined}
          tabIndex={isDev ? 0 : -1}
          onKeyDown={(e) => {
            if (!isDev) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onCardClick();
            }
          }}
        >
          {/* Front face — current visual identity card. */}
          <div className="dev-flip-face relative border border-[var(--border)] bg-[var(--surface)]">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[var(--accent)] via-[var(--accent-2)] to-transparent" />

            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                <span className="h-2 w-2 rounded-full bg-[#28ca41]" />
              </div>
              <span className="dev-mobile-glitch flex-1 text-center font-mono text-[10px] tracking-[0.12em] text-[var(--muted)]">
                {labels.label}
              </span>
            </div>

            <ThemePhoto
              className="aspect-[4/4.4] w-full"
              priority
              sizes="(min-width: 768px) 400px, 100vw"
            />

            <div className="border-t border-[var(--border)] bg-[var(--surface-2)] p-5">
              <h3 className="font-display text-base font-bold tracking-tight text-[var(--text)]">
                {labels.name}
              </h3>
              <p className="mt-0.5 font-mono text-[11px] tracking-[0.04em] text-[var(--accent)]">
                {labels.role}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4">
                <Stat value="6" label={labels.stats.years} />
                <Stat value="30+" label={labels.stats.projects} />
                <Stat value="12" label={labels.stats.stack} />
                <Stat value="4" label={labels.stats.countries} />
              </dl>
            </div>
          </div>

          {/* Back face — only visible in dev. Hidden via display:none in CSS for
              non-dev themes so backface-visibility doesn't ghost through. */}
          <div className="dev-flip-back dev-flip-face">
            <div className="dev-flip-back-head">
              maarkn@dev:~$ — eggs.sh
            </div>
            <pre className="dev-flip-back-body">
              <span className="dim">{`> running ./eggs.sh\n`}</span>
              <span className="ok">{`✔ egg 01 — this card flip\n`}</span>
              <span className="pending">{`○ egg 02 — open the browser console (desktop)\n`}</span>
              <span className="pending">{`○ egg 03 — type `}</span>
              <span className="cmd">{`/help`}</span>
              <span className="pending">{` in the chat\n`}</span>
              <span className="pending">{`○ egg 04 — Konami:  ↑ ↑ ↓ ↓ ← → ← →  B  A  (desktop)\n\n`}</span>
              <span className="dim">{`reach out\n`}</span>
              <span className="dim">{`─────────\n`}</span>
              <span className="cmd">{`markimkr@gmail.com\n`}</span>
              <span className="cmd">{`linkedin.com/in/maarkn\n`}</span>
              <span className="cmd">{`+55 62 98173 6748\n\n`}</span>
              <span className="dim">{`built by Marco Filho · maarkn.dev\n`}</span>
            </pre>
            <div className="dev-flip-back-foot">[ tap card to flip back ]</div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="font-display text-[1.4rem] font-bold leading-none tracking-tight text-[var(--accent-2)]">
        {value}
      </dd>
      <dt className="mt-1 font-display text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </dt>
    </div>
  );
}
