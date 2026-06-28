"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Globe, Lock } from "lucide-react";
import type { Project, ProjectCategory, ProjectStatus } from "@/lib/projects";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.07 11.07 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16v3.21c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

type CategoryLabels = Record<ProjectCategory, string>;
type StatusLabels = Record<ProjectStatus, string>;

type Labels = {
  categories: CategoryLabels;
  statuses: StatusLabels;
  taglines: Record<string, string>;
  view: string;
};

export function ProjectCard({
  project,
  index,
  locale,
  labels,
}: {
  project: Project;
  index: number;
  locale: string;
  labels: Labels;
}) {
  const tagline = labels.taglines[project.slug] ?? "";
  const detailHref = `/${locale}/projects/${project.slug}`;
  const isPrivate = project.sourceVisibility === "private";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3), ease: "easeOut" }}
      className="group relative flex flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)]"
    >
      <Cover project={project} statusLabel={labels.statuses[project.status]} />

      <div className="flex flex-1 flex-col gap-4 p-6">
        <header>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-[1.2rem] font-semibold tracking-tight text-[var(--text)]">
              {project.name}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              {project.year}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--accent)]">
            {labels.categories[project.category]}
          </p>
        </header>

        <p className="text-[14px] font-light leading-[1.7] text-[var(--text-2)]">{tagline}</p>

        <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {project.stack.slice(0, 4).map((tech) => (
            <li
              key={tech}
              className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-[10px] tracking-[0.02em] text-[var(--text-2)]"
            >
              {tech}
            </li>
          ))}
        </ul>

        <footer className="relative z-10 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-1">
            {!isPrivate && project.links?.repo ? (
              <IconLink href={project.links.repo} icon={GithubIcon} label="GitHub" />
            ) : null}
            {project.links?.demo ? (
              <IconLink href={project.links.demo} icon={Globe} label="Live demo" />
            ) : null}
            {isPrivate && !project.links?.demo ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <Lock className="h-3 w-3" strokeWidth={2} />
                {labels.statuses.nda}
              </span>
            ) : null}
            {!isPrivate && !project.links?.repo && !project.links?.demo ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                {labels.statuses[project.status]}
              </span>
            ) : null}
          </div>
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] transition-colors hover:text-[var(--accent)] group-hover:text-[var(--accent)]"
          >
            {labels.view}
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Link>
        </footer>
      </div>

      {/* Stretched link covering the whole card except the icon links and View case
          (which already sit at z-10 in the footer). Keeps the entire card clickable
          while letting the inner anchors stay independently navigable. */}
      <Link
        href={detailHref}
        aria-label={project.name}
        className="absolute inset-0 z-0"
      />

      <span
        className="pointer-events-none absolute bottom-0 left-0 h-px w-0 bg-[var(--accent)] transition-[width] duration-500 group-hover:w-full"
        aria-hidden
      />
    </motion.article>
  );
}

function IconLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="relative z-10 inline-flex h-8 w-8 items-center justify-center text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
    </a>
  );
}

function Cover({
  project,
  statusLabel,
}: {
  project: Project;
  statusLabel: string;
}) {
  const { from, to } = project.accent;
  const statusTone =
    project.status === "live"
      ? "bg-[var(--green)]/15 border-[var(--green)]/40 text-[var(--green)]"
      : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]";

  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden border-b border-[var(--border)]"
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
          backgroundSize: "40px 40px",
        }}
      />
      {project.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.coverImage}
          alt={project.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <span className="absolute left-5 top-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/85">
        <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
        {project.slug}
      </span>
      <span
        className={
          "absolute right-5 top-5 inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm " +
          statusTone
        }
      >
        {statusLabel}
      </span>
      {!project.coverImage ? (
        <span
          aria-hidden
          className="absolute bottom-4 left-5 font-display text-[clamp(3rem,6vw,5rem)] font-bold leading-none tracking-[-0.05em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
        >
          {project.monogram}
        </span>
      ) : null}
    </div>
  );
}
