"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Download,
  Mail,
  MessageCircle,
} from "lucide-react";
import { ThemePhoto } from "./theme-photo";
import { site } from "@/lib/site";

type LinkSpec = {
  href: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  external?: boolean;
};

type Labels = {
  eyebrow: string;
  name: string;
  role: string;
  bio: string;
  available: string;
  links: {
    linkedin: { label: string; hint: string };
    github: { label: string; hint: string };
    email: { label: string; hint: string };
    whatsapp: { label: string; hint: string };
    cv: { label: string; hint: string };
  };
};

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.07 11.07 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16v3.21c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.65-1.85 3.4-1.85 3.63 0 4.3 2.39 4.3 5.5v6.24zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM3.56 20.45h3.56V9H3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.99 0 1.78-.77 1.78-1.72V1.72C24 .77 23.21 0 22.22 0z" />
    </svg>
  );
}

export function LinksHub({ labels }: { labels: Labels }) {
  const items: LinkSpec[] = [
    {
      href: site.social.linkedin,
      label: labels.links.linkedin.label,
      hint: labels.links.linkedin.hint,
      icon: LinkedinIcon,
      external: true,
    },
    {
      href: site.social.github,
      label: labels.links.github.label,
      hint: labels.links.github.hint,
      icon: GithubIcon,
      external: true,
    },
    {
      href: `mailto:${site.email}`,
      label: labels.links.email.label,
      hint: labels.links.email.hint,
      icon: Mail,
    },
    {
      href: site.social.whatsapp,
      label: labels.links.whatsapp.label,
      hint: labels.links.whatsapp.hint,
      icon: MessageCircle,
      external: true,
    },
    {
      href: "/cv/marco-filho.pdf",
      label: labels.links.cv.label,
      hint: labels.links.cv.hint,
      icon: Download,
    },
  ];

  return (
    <section className="relative isolate min-h-[100dvh] overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "var(--accent)" }}
        aria-hidden
      />

      <div className="mx-auto flex w-full max-w-[480px] flex-col items-center px-6 pt-32 pb-20 md:pt-40">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative h-28 w-28 overflow-hidden rounded-full border border-[var(--border)]"
        >
          <ThemePhoto
            className="h-full w-full"
            sizes="112px"
            priority
          />
        </motion.div>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mt-6 inline-flex items-center gap-2 border border-[var(--green)]/40 bg-[color-mix(in_oklab,var(--green)_8%,transparent)] px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--green)]"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--green)] opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
          </span>
          {labels.available}
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="mt-5 font-display text-[1.65rem] font-bold tracking-[-0.02em] text-[var(--text)]"
        >
          {labels.name}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]"
        >
          {labels.role}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="mt-4 max-w-sm text-center text-[14px] font-light leading-[1.7] text-[var(--text-2)]"
        >
          {labels.bio}
        </motion.p>

        <ul className="mt-12 flex w-full flex-col gap-3">
          {items.map((it, i) => (
            <motion.li
              key={it.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.4 + i * 0.06, ease: "easeOut" }}
            >
              <a
                href={it.href}
                target={it.external ? "_blank" : undefined}
                rel={it.external ? "noreferrer" : undefined}
                className="group flex items-center justify-between gap-3 border border-[var(--border)] bg-[var(--surface)] px-5 py-4 transition-all hover:border-[var(--accent)] hover:bg-[var(--surface-2)]"
              >
                <span className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center text-[var(--muted)] transition-colors group-hover:text-[var(--accent)]">
                    <it.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-display text-[14px] font-semibold tracking-tight text-[var(--text)]">
                      {it.label}
                    </span>
                    {it.hint ? (
                      <span className="font-mono text-[10px] tracking-[0.04em] text-[var(--muted)]">
                        {it.hint}
                      </span>
                    ) : null}
                  </span>
                </span>
                <ArrowUpRight
                  className="h-4 w-4 text-[var(--muted)] transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)]"
                  strokeWidth={2}
                />
              </a>
            </motion.li>
          ))}
        </ul>

        <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          maarkn<span className="text-[var(--accent)]">.dev</span>
        </p>
      </div>
    </section>
  );
}
