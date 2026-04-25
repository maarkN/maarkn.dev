"use client";

import { motion } from "framer-motion";
import {
  groupOrder,
  metrics,
  toolkit,
  type MetricKey,
  type Tool,
  type ToolkitGroupKey,
} from "@/lib/toolkit";

type ToolkitLabels = {
  kicker: string;
  title: string;
  sub: string;
  groups: Record<ToolkitGroupKey, { title: string; caption: string }>;
  yearsSuffix: string;
  metrics: {
    heading: string;
    items: Record<MetricKey, string>;
  };
};

export function Toolkit({ labels }: { labels: ToolkitLabels }) {
  return (
    <section
      id="toolkit"
      className="relative border-t border-[var(--border)] bg-[var(--bg-low)]"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24 md:px-12 md:py-32">
        <div className="mb-16 max-w-2xl">
          <p className="dev-kicker font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
            <span className="light-only-text">{labels.kicker}</span>
            <span className="dev-only-text">Technical stack</span>
          </p>
          <h2 className="dev-section-title mt-3 font-display text-[clamp(2rem,3.6vw,3.2rem)] font-bold leading-[1.1] tracking-[-0.025em] text-[var(--text)]">
            <span className="light-only-text">{labels.title}</span>
            <span className="dev-only-text">SYSTEM_ARCHITECTURE</span>
          </h2>
          <p className="mt-5 max-w-xl text-[1.02rem] font-light leading-[1.75] text-[var(--text-2)]">
            {labels.sub}
          </p>
        </div>

        <div className="border border-[var(--border)] bg-[var(--bg)]">
          <div className="grid grid-cols-1 gap-px overflow-hidden bg-[var(--border)] md:grid-cols-2 lg:grid-cols-3">
            {groupOrder.map((g) => (
              <Group
                key={g}
                groupKey={g}
                title={labels.groups[g].title}
                caption={labels.groups[g].caption}
                yearsSuffix={labels.yearsSuffix}
              />
            ))}
          </div>

          <div className="border-t border-[var(--border)] px-7 py-10 md:px-10 md:py-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
              {labels.metrics.heading}
            </p>
            <ul className="mt-6 flex flex-col gap-5">
              {metrics.map((m, i) => (
                <MetricBar
                  key={m.key}
                  label={labels.metrics.items[m.key]}
                  value={m.value}
                  index={i}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Group({
  groupKey,
  title,
  caption,
  yearsSuffix,
}: {
  groupKey: ToolkitGroupKey;
  title: string;
  caption: string;
  yearsSuffix: string;
}) {
  const items = toolkit[groupKey];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="group relative flex flex-col gap-4 bg-[var(--bg)] p-7 transition-colors hover:bg-[var(--surface)]"
    >
      <header>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          {`0${groupOrder.indexOf(groupKey) + 1}`.padStart(2, "0")}
        </span>
        <h3 className="mt-2 font-display text-[1.15rem] font-semibold tracking-tight text-[var(--text)]">
          {title}
        </h3>
        <p className="mt-1 text-[13px] font-light text-[var(--muted)]">{caption}</p>
      </header>

      <ul className="flex flex-wrap gap-1.5">
        {items.map((tool, i) => (
          <ToolChip key={tool.name} tool={tool} index={i} yearsSuffix={yearsSuffix} />
        ))}
      </ul>

      <span
        className="pointer-events-none absolute bottom-0 left-0 h-px w-0 bg-[var(--accent)] transition-[width] duration-500 group-hover:w-full"
        aria-hidden
      />
    </motion.article>
  );
}

function ToolChip({
  tool,
  index,
  yearsSuffix,
}: {
  tool: Tool;
  index: number;
  yearsSuffix: string;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.32, delay: index * 0.025, ease: "easeOut" }}
      className="group/tag relative inline-flex items-center gap-1.5 border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 font-mono text-[11px] tracking-[0.02em] text-[var(--text-2)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      title={tool.years ? `${tool.years}${yearsSuffix} · ${tool.proficiency}%` : `${tool.proficiency}%`}
    >
      <span>{tool.name}</span>
      {tool.years ? (
        <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] group-hover/tag:text-[var(--accent-2)]">
          {tool.years}
          {yearsSuffix}
        </span>
      ) : null}
    </motion.li>
  );
}

function MetricBar({
  label,
  value,
  index,
}: {
  label: string;
  value: number;
  index: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: "easeOut" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text)]">
          {label}
        </span>
        <span className="font-mono text-[12px] tabular-nums tracking-[0.02em] text-[var(--accent)]">
          {value}%
        </span>
      </div>
      <div className="relative mt-2 h-[3px] overflow-hidden bg-[var(--surface-3)]">
        <motion.span
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
          className="absolute inset-y-0 left-0 bg-[var(--accent)] dev-tool-fill"
          aria-hidden
        />
      </div>
    </motion.li>
  );
}
