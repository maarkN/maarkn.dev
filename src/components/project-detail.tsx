"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Globe } from "lucide-react";
import type { Project, ProjectCategory, ProjectStatus } from "@/lib/projects";
import type { Locale } from "@/i18n/config";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.07 11.07 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16v3.21c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

type Detail = {
  description: string;
  role: string;
  features: string[];
};

type Labels = {
  back: string;
  viewLive: string;
  viewRepo: string;
  noLinks: string;
  roleHeading: string;
  featuresHeading: string;
  stackHeading: string;
  tagline: string;
  detail: Detail;
  categories: Record<ProjectCategory, string>;
  statuses: Record<ProjectStatus, string>;
};

export function ProjectDetail({
  project,
  locale,
  labels,
}: {
  project: Project;
  locale: Locale;
  labels: Labels;
}) {
  const { from, to } = project.accent;
  const statusTone =
    project.status === "live"
      ? "border-[var(--green)]/50 text-[var(--green)] bg-[var(--green)]/10"
      : "border-[var(--border-2)] text-[var(--muted)] bg-[var(--surface-2)]";

  return (
    <article className="border-t border-[var(--border)]">
      <div className="mx-auto w-full max-w-[1100px] px-6 pt-32 md:px-12 md:pt-40">
        <Link
          href={`/${locale}/projects`}
          className="group inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
        >
          <ArrowLeft
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
            strokeWidth={2.4}
          />
          {labels.back}
        </Link>

        <header className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_300px] md:gap-12">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
                {labels.categories[project.category]}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                · {project.year}
              </span>
              <span
                className={
                  "inline-flex items-center gap-2 border px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] " +
                  statusTone
                }
              >
                {labels.statuses[project.status]}
              </span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mt-4 font-display text-[clamp(2.4rem,4.4vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--text)]"
            >
              {project.name}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="mt-5 max-w-[60ch] text-[1.1rem] font-light leading-[1.7] text-[var(--text-2)]"
            >
              {labels.tagline}
            </motion.p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {project.links?.demo ? (
                <a
                  href={project.links.demo}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-white transition hover:opacity-90"
                >
                  <Globe className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {labels.viewLive}
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                </a>
              ) : null}
              {project.links?.repo ? (
                <a
                  href={project.links.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-[var(--border-2)] px-5 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <GithubIcon className="h-3.5 w-3.5" />
                  {labels.viewRepo}
                </a>
              ) : null}
              {!project.links?.demo && !project.links?.repo ? (
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {labels.noLinks}
                </span>
              ) : null}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.05, ease: "easeOut" }}
            className="relative aspect-square w-full overflow-hidden border border-[var(--border)]"
            style={{ backgroundColor: from }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(120% 80% at 0% 0%, ${from} 0%, transparent 60%), radial-gradient(120% 80% at 100% 100%, ${to} 0%, transparent 60%), linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
              }}
            />
            <div
              className="absolute inset-0 mix-blend-overlay opacity-50"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
            <span className="absolute left-6 top-6 font-mono text-[10px] uppercase tracking-[0.16em] text-white/85">
              {project.slug}
            </span>
            <span
              aria-hidden
              className="absolute bottom-6 left-6 font-display text-[clamp(4rem,12vw,8rem)] font-bold leading-none tracking-[-0.06em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
            >
              {project.monogram}
            </span>
          </motion.div>
        </header>

        <section className="mt-16 grid gap-12 border-t border-[var(--border)] pt-14 md:grid-cols-[minmax(0,1fr)_280px] md:gap-16">
          <div className="space-y-12">
            <Block title={labels.roleHeading} body={labels.detail.role} />
            <div>
              <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                {labels.featuresHeading}
              </h2>
              <ul className="mt-5 space-y-3">
                {labels.detail.features.map((f, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                    className="flex items-baseline gap-3 text-[1rem] font-light leading-[1.65] text-[var(--text-2)]"
                  >
                    <span
                      className="mt-2 inline-block h-1 w-3 flex-none bg-[var(--accent)]"
                      aria-hidden
                    />
                    <span>{f}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <Block body={labels.detail.description} />
          </div>

          <aside>
            <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              {labels.stackHeading}
            </h2>
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {project.stack.map((tech) => (
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

        <div className="mt-16 mb-32 border-t border-[var(--border)] pt-10">
          <Link
            href={`/${locale}/projects`}
            className="group inline-flex items-center gap-2 font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={2.2}
            />
            {labels.back}
          </Link>
        </div>
      </div>
    </article>
  );
}

function Block({ title, body }: { title?: string; body: string }) {
  return (
    <div>
      {title ? (
        <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          {title}
        </h2>
      ) : null}
      <p
        className={
          (title ? "mt-5 " : "") +
          "max-w-[64ch] text-[1.05rem] font-light leading-[1.8] text-[var(--text-2)]"
        }
      >
        {body}
      </p>
    </div>
  );
}
