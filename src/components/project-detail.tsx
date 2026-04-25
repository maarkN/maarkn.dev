"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Globe, Lock } from "lucide-react";
import type { Project, ProjectCategory, ProjectStatus } from "@/lib/projects";
import type { Locale } from "@/i18n/config";
import { ParallaxCover } from "./parallax-cover";

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
  privateLabel: string;
  privateNote: string;
  galleryHeading: string;
  roleHeading: string;
  featuresHeading: string;
  stackHeading: string;
  tagline: string;
  detail: Detail;
  /** Map of slug → caption key → caption string. */
  galleryCaptions?: Record<string, string>;
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
  const isPrivate = project.sourceVisibility === "private";
  const showRepoButton = !isPrivate && Boolean(project.links?.repo);
  const showDemoButton = Boolean(project.links?.demo);
  const statusTone =
    project.status === "live"
      ? "border-[var(--green)]/50 text-[var(--green)] bg-[var(--green)]/10"
      : "border-[var(--border-2)] text-[var(--muted)] bg-[var(--surface-2)]";

  return (
    <article>
      <ParallaxCover
        monogram={project.monogram}
        accent={project.accent}
        label={project.slug}
      >
        <div className="max-w-3xl">
          <Link
            href={`/${locale}/projects`}
            className="group mb-6 inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85 transition-colors hover:text-white"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={2.4}
            />
            {labels.back}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/85">
              {labels.categories[project.category]}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
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
            className="mt-3 font-display text-[clamp(2rem,4vw,3.6rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white"
          >
            {project.name}
          </motion.h1>
        </div>
      </ParallaxCover>

      <div className="mx-auto w-full max-w-[1100px] px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-32 md:px-12">
        <p className="max-w-[64ch] text-[1.1rem] font-light leading-[1.75] text-[var(--text-2)]">
          {labels.tagline}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {showDemoButton ? (
            <a
              href={project.links!.demo!}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-white transition hover:opacity-90"
            >
              <Globe className="h-3.5 w-3.5" strokeWidth={2.2} />
              {labels.viewLive}
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </a>
          ) : null}

          {showRepoButton ? (
            <a
              href={project.links!.repo!}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-[var(--border-2)] px-5 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              {labels.viewRepo}
            </a>
          ) : null}

          {isPrivate ? (
            <PrivatePill label={labels.privateLabel} note={labels.privateNote} />
          ) : null}

          {!showDemoButton && !showRepoButton && !isPrivate ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {labels.noLinks}
            </span>
          ) : null}
        </div>

        {project.gallery && project.gallery.length > 0 ? (
          <Gallery
            project={project}
            heading={labels.galleryHeading}
            captionMap={labels.galleryCaptions}
          />
        ) : null}

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
                    <span className="mt-2 inline-block h-1 w-3 flex-none bg-[var(--accent)]" aria-hidden />
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

        <div className="mt-16 border-t border-[var(--border)] pt-10">
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

function PrivatePill({ label, note }: { label: string; note: string }) {
  return (
    <div className="inline-flex max-w-[34ch] items-start gap-3 border border-[var(--border-2)] bg-[var(--surface-2)] px-4 py-2.5">
      <Lock className="mt-0.5 h-4 w-4 flex-none text-[var(--muted)]" strokeWidth={2} />
      <div>
        <p className="font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text)]">
          {label}
        </p>
        <p className="mt-1 font-light text-[11px] leading-[1.55] text-[var(--muted)]">{note}</p>
      </div>
    </div>
  );
}

function Gallery({
  project,
  heading,
  captionMap,
}: {
  project: Project;
  heading: string;
  captionMap?: Record<string, string>;
}) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        {heading}
      </h2>
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {project.gallery!.map((shot, i) => {
          const caption =
            shot.captionKey && captionMap ? captionMap[shot.captionKey] : undefined;
          const accent = shot.accent ?? project.accent;
          const monogram = shot.monogram ?? project.monogram;
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              className="border border-[var(--border)] bg-[var(--surface)]"
            >
              <div
                className="relative aspect-[4/3] overflow-hidden"
                style={{ backgroundColor: accent.from }}
              >
                {shot.url ? (
                  <Image
                    src={shot.url}
                    alt={caption ?? `${project.name} screenshot ${i + 1}`}
                    fill
                    sizes="(min-width: 1024px) 320px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `radial-gradient(120% 80% at 0% 0%, ${accent.from} 0%, transparent 60%), radial-gradient(120% 80% at 100% 100%, ${accent.to} 0%, transparent 60%), linear-gradient(135deg, ${accent.from} 0%, ${accent.to} 100%)`,
                      }}
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 mix-blend-overlay opacity-50"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                      }}
                    />
                    <span
                      aria-hidden
                      className="absolute bottom-3 left-4 font-display text-[2rem] font-bold leading-none tracking-[-0.04em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
                    >
                      {monogram}
                    </span>
                  </>
                )}
              </div>
              {caption ? (
                <p className="border-t border-[var(--border)] px-4 py-3 font-mono text-[11px] tracking-[0.04em] text-[var(--muted)]">
                  {caption}
                </p>
              ) : null}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
