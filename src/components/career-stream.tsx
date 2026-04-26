"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { timeline, type TimelineEntry } from "@/lib/timeline";

type Detail = {
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

type StreamLabels = {
  intro: { kicker: string; title: string; sub: string; scrollHint: string };
  chrome: Chrome;
  details: Record<string, Detail>;
  /** From dict.about.timeline so we still have the role label per slug. */
  roles: Record<string, string>;
  /** Right rail / per-section CTA copy. */
  readFull: string;
};

/**
 * Vertical parallax stream that walks visitors through every experience.
 * Each entry occupies one viewport (min-h-screen). The background gradient
 * crossfades from one accent pair to the next driven by the page-level
 * scrollYProgress, while the foreground content slides + fades around its
 * own scroll window so the screen never feels static during a transition.
 */
export function CareerStream({ locale, labels }: { locale: string; labels: StreamLabels }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: containerRef });

  return (
    <div ref={containerRef} className="relative">
      <BackgroundLayer reduced={reduced ?? false} progress={scrollYProgress} />
      <ProgressRail
        slugs={timeline.map((t) => t.slug)}
        progress={scrollYProgress}
        locale={locale}
      />

      <Intro labels={labels.intro} />

      <ol>
        {timeline.map((entry, i) => (
          <ExperiencePanel
            key={entry.slug}
            entry={entry}
            index={i}
            total={timeline.length}
            detail={labels.details[entry.slug]}
            chrome={labels.chrome}
            role={labels.roles[entry.key] ?? entry.company}
            locale={locale}
            readFull={labels.readFull}
            reduced={reduced ?? false}
          />
        ))}
      </ol>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */

function Intro({
  labels,
}: {
  labels: { kicker: string; title: string; sub: string; scrollHint: string };
}) {
  return (
    <section className="relative isolate flex min-h-[80vh] items-center px-4 sm:px-6 md:px-12">
      <div className="mx-auto w-full max-w-[1100px] pt-32 pb-20 md:pt-40 md:pb-24">
        <p className="dev-kicker font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
          <span className="light-only-text">{labels.kicker}</span>
          <span className="dev-only-text">Career stream · scroll to advance</span>
        </p>
        <h1 className="dev-section-title mt-3 font-display text-[clamp(2.4rem,5vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--text)]">
          <span className="light-only-text">{labels.title}</span>
          <span className="dev-only-text inline sm:hidden">CAREER.log</span>
          <span className="dev-only-text hidden sm:inline">CAREER_STREAM</span>
        </h1>
        <p className="mt-6 max-w-2xl text-[1.05rem] font-light leading-[1.75] text-[var(--text-2)]">
          {labels.sub}
        </p>
        <p className="mt-12 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
          ↓ {labels.scrollHint}
        </p>
      </div>
    </section>
  );
}

/**
 * Fixed full-bleed background that crossfades each entry's accent gradient
 * based on global scroll progress. We render every gradient once and tween
 * its opacity on a triangular window so adjacent entries blend.
 */
function BackgroundLayer({
  reduced,
  progress,
}: {
  reduced: boolean;
  progress: MotionValue<number>;
}) {
  const total = timeline.length;
  // Reserve the first 12% of the page for the intro; experiences live in 88%.
  const introBudget = 0.12;
  const slot = (1 - introBudget) / total;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--bg)]">
      {timeline.map((entry, i) => {
        const center = introBudget + slot * (i + 0.5);
        return (
          <BgGradient
            key={entry.slug}
            from={entry.accent.from}
            to={entry.accent.to}
            center={center}
            slot={slot}
            progress={progress}
            reduced={reduced}
          />
        );
      })}

      <div
        aria-hidden
        className="absolute inset-0 mix-blend-overlay opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--bg)]/95 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--bg)]/95 to-transparent"
      />
    </div>
  );
}

function BgGradient({
  from,
  to,
  center,
  slot,
  progress,
  reduced,
}: {
  from: string;
  to: string;
  center: number;
  slot: number;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const opacity = useTransform(progress, (v) => {
    if (reduced) return 1 / timeline.length;
    const dist = Math.abs(v - center);
    const w = slot * 0.85;
    if (dist >= w) return 0;
    return 1 - dist / w;
  });
  const scale = useTransform(progress, (v) => {
    if (reduced) return 1;
    const dist = Math.abs(v - center);
    return 1 + Math.min(dist, slot) * 0.15;
  });

  return (
    <motion.div
      style={{
        opacity,
        scale,
        backgroundImage: `radial-gradient(120% 80% at 0% 0%, ${from} 0%, transparent 60%), radial-gradient(120% 80% at 100% 100%, ${to} 0%, transparent 60%), linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      }}
      className="absolute inset-0 will-change-transform"
    />
  );
}

/**
 * Sticky right-side rail showing all entries as dots. The active dot is the
 * one whose section is centered in the viewport — derived from
 * scrollYProgress rather than IntersectionObserver so it stays in sync with
 * the background layer.
 */
function ProgressRail({
  slugs,
  progress,
  locale,
}: {
  slugs: string[];
  progress: MotionValue<number>;
  locale: string;
}) {
  const introBudget = 0.12;
  const slot = (1 - introBudget) / slugs.length;
  const activeIndex = useTransform(progress, (v) => {
    if (v < introBudget) return -1;
    return Math.min(slugs.length - 1, Math.floor((v - introBudget) / slot));
  });

  return (
    <div className="pointer-events-none fixed top-1/2 right-3 z-20 hidden -translate-y-1/2 md:right-5 md:flex md:flex-col md:gap-3">
      {slugs.map((slug, i) => (
        <RailDot key={slug} index={i} active={activeIndex} slug={slug} locale={locale} />
      ))}
    </div>
  );
}

function RailDot({
  index,
  active,
  slug,
  locale,
}: {
  index: number;
  active: MotionValue<number>;
  slug: string;
  locale: string;
}) {
  const opacity = useTransform(active, (v) => (v === index ? 1 : 0.35));
  const scale = useTransform(active, (v) => (v === index ? 1.6 : 1));

  return (
    <Link
      href={`/${locale}/career/${slug}`}
      className="pointer-events-auto group relative flex h-3 w-3 items-center justify-center"
      aria-label={`Experience ${index + 1}`}
    >
      <motion.span
        style={{ opacity, scale }}
        className="absolute inset-0 rounded-full border border-[var(--accent)] bg-[var(--accent)] transition-colors"
      />
      <motion.span
        style={{ opacity }}
        className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-sm bg-[var(--surface)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)] group-hover:block"
      >
        {`0${index + 1}`.padStart(2, "0")}
      </motion.span>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────── */

function ExperiencePanel({
  entry,
  index,
  total,
  detail,
  chrome,
  role,
  locale,
  readFull,
  reduced,
}: {
  entry: TimelineEntry;
  index: number;
  total: number;
  detail?: Detail;
  chrome: Chrome;
  role: string;
  locale: string;
  readFull: string;
  reduced: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const monoY = useTransform(scrollYProgress, (v) =>
    reduced ? 0 : (v - 0.5) * -160
  );
  const monoRotate = useTransform(scrollYProgress, (v) =>
    reduced ? 0 : (v - 0.5) * 8
  );
  const contentY = useTransform(scrollYProgress, (v) =>
    reduced ? 0 : (v - 0.5) * 60
  );
  const contentOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const contentX = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [-40, 0, 0, -40]);

  return (
    <li
      ref={ref}
      className="relative isolate flex min-h-screen items-center px-4 py-24 sm:px-8 sm:py-32 md:px-12"
    >
      <motion.span
        aria-hidden
        style={{ y: monoY, rotate: monoRotate }}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none font-display text-[clamp(8rem,28vw,22rem)] font-bold leading-none tracking-[-0.06em] text-white/15 mix-blend-overlay sm:right-6 md:right-12"
      >
        {entry.monogram}
      </motion.span>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity, x: contentX }}
        className="relative z-10 mx-auto w-full max-w-[820px]"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/85">
          <span aria-hidden>{`0${index + 1}`.padStart(2, "0")}</span>
          <span className="mx-2 text-white/55">/</span>
          <span aria-hidden>{`0${total}`.padStart(2, "0")}</span>
          <span className="mx-3 text-white/55">·</span>
          {entry.period}
          {entry.current ? <span className="ml-2 text-white">[ current ]</span> : null}
        </p>

        <h2 className="mt-4 font-display text-[clamp(2.2rem,4.6vw,4.2rem)] font-bold leading-[1.04] tracking-[-0.03em] text-white">
          {role}
        </h2>
        <p className="mt-2 font-display text-[clamp(1rem,1.6vw,1.4rem)] font-medium text-white/80">
          {entry.company}
        </p>

        {detail ? (
          <p className="mt-6 max-w-[60ch] text-[1.06rem] font-light leading-[1.75] text-white/90">
            {detail.tagline}
          </p>
        ) : null}

        {detail ? (
          <ul className="mt-8 space-y-2">
            {detail.achievements.slice(0, 3).map((s, i) => (
              <li
                key={i}
                className="flex items-baseline gap-3 text-[0.98rem] font-light leading-[1.65] text-white/90"
              >
                <span
                  className="mt-2 inline-block h-1 w-3 flex-none bg-white/85"
                  aria-hidden
                />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-2">
          {entry.tech.slice(0, 5).map((t) => (
            <span
              key={t}
              className="border border-white/30 bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-[0.04em] text-white/85"
            >
              {t}
            </span>
          ))}
        </div>

        <Link
          href={`/${locale}/career/${entry.slug}`}
          className="group mt-10 inline-flex items-center gap-2 border border-white/40 bg-white/5 px-5 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-white/15"
        >
          {readFull}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2.2}
          />
        </Link>
      </motion.div>

      <motion.span
        style={{ opacity: contentOpacity }}
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/65 md:flex"
      >
        ↓ next
        <ArrowUpRight className="h-3 w-3" strokeWidth={2.2} />
      </motion.span>
    </li>
  );
}
