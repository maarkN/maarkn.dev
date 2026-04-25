"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * A tall hero cover that translates the gradient layer slower than scroll for
 * a soft parallax feel. Respects prefers-reduced-motion: when set, the layers
 * stay still and the visitor still gets the framing without movement.
 */
export function ParallaxCover({
  monogram,
  accent,
  label,
  height = "h-[42vh] sm:h-[52vh] md:h-[60vh]",
  children,
}: {
  monogram: string;
  accent: { from: string; to: string };
  label?: string;
  height?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const yBg = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, 140]);
  const yMono = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, 80]);
  const yLabel = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, 30]);
  const opacityFg = useTransform(scrollYProgress, [0, 0.7], [1, 0.35]);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden border-y border-[var(--border)] ${height}`}
      style={{ backgroundColor: accent.from }}
    >
      <motion.div
        style={{
          y: yBg,
          backgroundImage: `radial-gradient(120% 80% at 0% 0%, ${accent.from} 0%, transparent 60%), radial-gradient(120% 80% at 100% 100%, ${accent.to} 0%, transparent 60%), linear-gradient(135deg, ${accent.from} 0%, ${accent.to} 100%)`,
        }}
        className="absolute inset-0 will-change-transform"
      />
      <motion.div
        aria-hidden
        style={{ y: yBg }}
        className="absolute inset-0 mix-blend-overlay opacity-40 will-change-transform"
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </motion.div>

      {label ? (
        <motion.span
          style={{ y: yLabel, opacity: opacityFg }}
          className="absolute left-6 top-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/85"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
          {label}
        </motion.span>
      ) : null}

      <motion.span
        style={{ y: yMono, opacity: opacityFg }}
        aria-hidden
        className="absolute bottom-6 left-6 font-display text-[clamp(4rem,15vw,9rem)] font-bold leading-none tracking-[-0.06em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
      >
        {monogram}
      </motion.span>

      <div className="relative z-10 flex h-full items-end px-4 pb-8 sm:px-6 sm:pb-12 md:px-12 md:pb-16">
        {children}
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[var(--bg)]/80"
      />
    </div>
  );
}
