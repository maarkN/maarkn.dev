"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { TimelineEntry } from "@/lib/timeline";
import { ParallaxCover } from "./parallax-cover";

export type CareerDetail = {
  tagline: string;
  context: string;
  responsibilities: string[];
  achievements: string[];
  outcome: string;
};

type Chrome = {
  back: string;
  context: string;
  responsibilities: string;
  achievements: string;
  outcome: string;
  stackHeading: string;
  periodLabel: string;
  companyLabel: string;
};

export function CareerDetailView({
  entry,
  detail,
  chrome,
  locale,
  roleLabel,
}: {
  entry: TimelineEntry;
  detail: CareerDetail;
  chrome: Chrome;
  locale: string;
  roleLabel: string;
}) {
  return (
    <article>
      <ParallaxCover
        monogram={entry.monogram}
        accent={entry.accent}
        label={entry.company}
      >
        <div className="max-w-3xl">
          <Link
            href={`/${locale}#about`}
            className="group mb-6 inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85 transition-colors hover:text-white"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={2.4}
            />
            {chrome.back}
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/85">
            {entry.period}
            {entry.current ? " · current" : ""}
          </p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-3 max-w-3xl font-display text-[clamp(2rem,4vw,3.6rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white"
          >
            {roleLabel}
          </motion.h1>
        </div>
      </ParallaxCover>

      <div className="mx-auto w-full max-w-[1100px] px-4 py-16 sm:px-6 sm:py-20 md:px-12 md:py-28">
        <header className="grid gap-6 border-b border-[var(--border)] pb-10 md:grid-cols-[minmax(0,1fr)_300px] md:gap-12">
          <p className="text-[1.1rem] font-light leading-[1.7] text-[var(--text-2)]">
            {detail.tagline}
          </p>
          <dl className="grid grid-cols-2 gap-4 text-[12px] md:grid-cols-1">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {chrome.companyLabel}
              </dt>
              <dd className="mt-1 font-display text-[14px] font-semibold tracking-tight text-[var(--text)]">
                {entry.company}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {chrome.periodLabel}
              </dt>
              <dd className="mt-1 font-mono text-[12px] tracking-[0.04em] text-[var(--text-2)]">
                {entry.period}
              </dd>
            </div>
          </dl>
        </header>

        <section className="mt-12 grid gap-12 md:grid-cols-[minmax(0,1fr)_280px] md:gap-16">
          <div className="space-y-12">
            <Block title={chrome.context} body={detail.context} />
            <BulletBlock title={chrome.responsibilities} items={detail.responsibilities} />
            <BulletBlock title={chrome.achievements} items={detail.achievements} />
            <Block title={chrome.outcome} body={detail.outcome} />
          </div>

          <aside>
            <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              {chrome.stackHeading}
            </h2>
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {entry.tech.map((tech) => (
                <li
                  key={tech}
                  className="border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 font-mono text-[11px] tracking-[0.02em] text-[var(--text-2)]"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <div className="mt-16 border-t border-[var(--border)] pt-10">
          <Link
            href={`/${locale}#about`}
            className="group inline-flex items-center gap-2 font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={2.2}
            />
            {chrome.back}
          </Link>
        </div>
      </div>
    </article>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        {title}
      </h2>
      <p className="mt-5 max-w-[64ch] text-[1.05rem] font-light leading-[1.8] text-[var(--text-2)]">
        {body}
      </p>
    </div>
  );
}

function BulletBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        {title}
      </h2>
      <ul className="mt-5 space-y-3">
        {items.map((s, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
            className="flex items-baseline gap-3 text-[1rem] font-light leading-[1.65] text-[var(--text-2)]"
          >
            <span className="mt-2 inline-block h-1 w-3 flex-none bg-[var(--accent)]" aria-hidden />
            <span>{s}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
