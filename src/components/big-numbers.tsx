"use client";

import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

type Item = { value: string; label: string };

type Labels = {
  kicker: string;
  title: string;
  items: { years: Item; projects: Item; stacks: Item; countries: Item };
};

export function BigNumbers({ labels }: { labels: Labels }) {
  const items = [labels.items.years, labels.items.projects, labels.items.stacks, labels.items.countries];

  return (
    <section className="relative border-t border-[var(--border)]">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24 md:px-12 md:py-32">
        <div className="mb-14 max-w-2xl">
          <p className="dev-kicker font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
            {labels.kicker}
          </p>
          <h2 className="dev-section-title mt-3 font-display text-[clamp(2rem,3.6vw,3.2rem)] font-bold leading-[1.1] tracking-[-0.025em] text-[var(--text)]">
            {labels.title}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] md:grid-cols-4">
          {items.map((it, i) => (
            <Counter key={i} value={it.value} label={it.label} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Counter({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: true });
  const numericTarget = parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
  const suffix = value.replace(/[0-9]/g, "");
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => Math.round(v).toString());

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, numericTarget, { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, mv, numericTarget]);

  return (
    <div
      ref={ref}
      className="group relative bg-[var(--bg)] p-7 transition-colors hover:bg-[var(--surface)]"
    >
      <div className="flex items-baseline gap-1 font-display text-[clamp(2.6rem,5vw,4.2rem)] font-bold leading-none tracking-[-0.04em] text-[var(--accent-2)]">
        <motion.span>{display}</motion.span>
        <span className="text-[var(--accent)]">{suffix}</span>
      </div>
      <p className="mt-4 max-w-[18ch] text-sm font-light text-[var(--muted)]">
        {label}
      </p>
      <span className="absolute left-7 top-7 h-px w-8 bg-[var(--accent)] opacity-60" />
    </div>
  );
}
