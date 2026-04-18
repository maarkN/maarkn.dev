"use client";

import { motion } from "framer-motion";
import { timeline, type TimelineKey } from "@/lib/timeline";

type AboutLabels = {
  kicker: string;
  title: string;
  bio: string[];
  valuesTitle: string;
  values: { title: string; body: string }[];
  timelineTitle: string;
  timelineNow: string;
  timeline: Record<TimelineKey, { role: string; summary: string }>;
};

export function About({ labels }: { labels: AboutLabels }) {
  return (
    <section
      id="about"
      className="relative border-t border-[var(--border)]"
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 py-24 md:px-12 md:py-32">
        <Header kicker={labels.kicker} title={labels.title} />

        <div className="grid gap-16 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:gap-24">
          <div className="space-y-6 text-[1.05rem] font-light leading-[1.8] text-[var(--text-2)]">
            {labels.bio.map((p, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
              >
                {p}
              </motion.p>
            ))}
          </div>

          <div>
            <h3 className="mb-5 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              {labels.valuesTitle}
            </h3>
            <ul className="space-y-5">
              {labels.values.map((v, i) => (
                <motion.li
                  key={v.title}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                  className="border-l-2 border-[var(--border)] pl-4 transition-colors hover:border-[var(--accent)]"
                >
                  <p className="font-display text-[14px] font-semibold tracking-tight text-[var(--text)]">
                    {v.title}
                  </p>
                  <p className="mt-1 text-sm font-light text-[var(--muted)]">
                    {v.body}
                  </p>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-24 md:mt-32">
          <h3 className="mb-10 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            {labels.timelineTitle}
          </h3>

          <ol className="relative">
            <span
              className="pointer-events-none absolute bottom-0 left-[7px] top-2 w-px bg-gradient-to-b from-[var(--accent)] via-[var(--border-2)] to-transparent"
              aria-hidden
            />
            {timeline.map((entry, i) => {
              const t = labels.timeline[entry.key];
              return (
                <motion.li
                  key={`${entry.key}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.25), ease: "easeOut" }}
                  className="relative grid grid-cols-[28px_1fr] gap-x-5 pb-10 last:pb-0 md:grid-cols-[28px_180px_1fr]"
                >
                  <span
                    className={
                      "relative mt-1.5 h-3.5 w-3.5 rounded-full border-2 " +
                      (entry.current
                        ? "border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_0_4px_var(--accent-glow)]"
                        : "border-[var(--border-2)] bg-[var(--bg)]")
                    }
                    aria-hidden
                  />
                  <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] md:order-none">
                    {entry.current ? `${labels.timelineNow} · ${entry.period}` : entry.period}
                  </p>
                  <div className="col-span-2 mt-1 md:col-span-1 md:mt-0">
                    <p className="font-display text-[15px] font-semibold tracking-tight text-[var(--text)]">
                      {t.role}{" "}
                      <span className="font-normal text-[var(--muted)]">— {entry.company}</span>
                    </p>
                    <p className="mt-1 text-[14px] font-light leading-[1.7] text-[var(--text-2)]">
                      {t.summary}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Header({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-16 max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
        {kicker}
      </p>
      <h2 className="mt-3 font-display text-[clamp(2rem,3.6vw,3.2rem)] font-bold leading-[1.1] tracking-[-0.025em] text-[var(--text)]">
        {title}
      </h2>
    </div>
  );
}
