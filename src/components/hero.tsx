"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import { IdentityCard } from "./identity-card";

type HeroLabels = {
  badgeAvailable: string;
  eyebrow: string;
  title: { line1: string; line2: string; line3: string };
  role: string;
  sub: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

type CardLabels = React.ComponentProps<typeof IdentityCard>["labels"];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export function Hero({
  labels,
  cardLabels,
}: {
  labels: HeroLabels;
  cardLabels: CardLabels;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-12 px-4 pt-24 pb-20 sm:px-6 sm:gap-16 sm:pt-28 sm:pb-24 md:grid-cols-[1fr_400px] md:gap-20 md:px-12 md:pt-40 md:pb-32">
        <div className="max-w-[640px]">
          <motion.span
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
            className="inline-flex items-center gap-2 border border-[var(--green)]/40 bg-[color-mix(in_oklab,var(--green)_8%,transparent)] px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--green)]"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--green)] opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-[var(--green)]" />
            </span>
            {labels.badgeAvailable}
          </motion.span>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }}
            className="dev-eyebrow mt-8 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]"
          >
            {labels.eyebrow}
          </motion.p>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="dev-hero-shadow mt-4 font-display text-[clamp(2rem,7vw,4.5rem)] font-bold leading-[1.04] tracking-[-0.03em]"
          >
            <span className="block text-[var(--text)]">{labels.title.line1}</span>
            <span className="block text-[var(--text)]">{labels.title.line2}</span>
            <span className="block text-[var(--accent)]">{labels.title.line3}</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
            className="mt-3 max-w-[560px] text-base font-light text-[var(--muted)]"
          >
            {labels.role}
          </motion.p>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
            className="mt-8 max-w-[560px] text-[1.05rem] font-light leading-[1.75] text-[var(--text-2)]"
          >
            {labels.sub}
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <a
              href="#work"
              className="group inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-7 py-3 font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-white transition hover:-translate-y-px hover:opacity-90 hover:shadow-[0_8px_28px_var(--accent-glow)]"
            >
              {labels.ctaPrimary}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2.2}
              />
            </a>
            <a
              href="/cv/marco-filho.pdf"
              className="inline-flex items-center gap-2 border border-[var(--border-2)] bg-transparent px-7 py-3 font-display text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Download className="h-4 w-4" strokeWidth={2.2} />
              {labels.ctaSecondary}
            </a>
          </motion.div>
        </div>

        <IdentityCard labels={cardLabels} />
      </div>
    </section>
  );
}
