import type { CSSProperties } from "react";
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

// Staggered CSS entrance (runs on first paint, no JS) — the LCP heading paints
// at full opacity immediately instead of waiting for framer-motion to hydrate.
const delay = (s: number) => ({ "--hero-delay": `${s}s` }) as CSSProperties;

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
          <span
            style={delay(0.02)}
            className="hero-rise inline-flex items-center gap-2 border border-[var(--green)]/40 bg-[color-mix(in_oklab,var(--green)_8%,transparent)] px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--green)]"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--green)] opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-[var(--green)]" />
            </span>
            {labels.badgeAvailable}
          </span>

          <p
            style={delay(0.08)}
            className="hero-rise dev-eyebrow mt-8 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]"
          >
            {labels.eyebrow}
          </p>

          <h1
            style={delay(0.12)}
            className="hero-rise-solid dev-hero-shadow mt-4 font-display text-[clamp(2rem,7vw,4.5rem)] font-bold leading-[1.04] tracking-[-0.03em]"
          >
            <span className="block text-[var(--text)]">{labels.title.line1}</span>
            <span className="block text-[var(--text)]">{labels.title.line2}</span>
            <span className="block text-[var(--accent)]">{labels.title.line3}</span>
          </h1>

          <p
            style={delay(0.2)}
            className="hero-rise mt-3 max-w-[560px] text-base font-light text-[var(--muted)]"
          >
            {labels.role}
          </p>

          <p
            style={delay(0.26)}
            className="hero-rise mt-8 max-w-[560px] text-[1.05rem] font-light leading-[1.75] text-[var(--text-2)]"
          >
            {labels.sub}
          </p>

          <div
            style={delay(0.32)}
            className="hero-rise mt-10 flex flex-wrap items-center gap-4"
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
          </div>
        </div>

        <IdentityCard labels={cardLabels} />
      </div>
    </section>
  );
}
