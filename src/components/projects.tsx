"use client";

import { ArrowRight } from "lucide-react";
import { featuredProjects } from "@/lib/projects";
import { ProjectCard } from "./project-card";
import type { ProjectCategory, ProjectStatus } from "@/lib/projects";
import type { Locale } from "@/i18n/config";

type Labels = {
  kicker: string;
  title: string;
  sub: string;
  view: string;
  seeAll: string;
  categories: Record<ProjectCategory, string>;
  statuses: Record<ProjectStatus, string>;
  taglines: Record<string, string>;
};

export function Projects({ locale, labels }: { locale: Locale; labels: Labels }) {
  return (
    <section id="work" className="relative border-t border-[var(--border)]">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24 md:px-12 md:py-32">
        <div className="mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="dev-kicker font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
              <span className="light-only-text">{labels.kicker}</span>
              <span className="dev-only-text">Selected work</span>
            </p>
            <h2 className="dev-section-title mt-3 font-display text-[clamp(2rem,3.6vw,3.2rem)] font-bold leading-[1.1] tracking-[-0.025em] text-[var(--text)]">
              <span className="light-only-text">{labels.title}</span>
              <span className="dev-only-text inline sm:hidden">PROJECTS.db</span>
              <span className="dev-only-text hidden sm:inline">PROJECT_REGISTRY</span>
            </h2>
            <p className="mt-5 max-w-xl text-[1.02rem] font-light leading-[1.75] text-[var(--text-2)]">
              {labels.sub}
            </p>
          </div>

          <a
            href={`/${locale}/projects`}
            className="group inline-flex items-center gap-2 self-start border border-[var(--border-2)] px-5 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] md:self-end"
          >
            {labels.seeAll}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.2}
            />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((p, i) => (
            <ProjectCard
              key={p.slug}
              project={p}
              index={i}
              locale={locale}
              labels={{
                categories: labels.categories,
                statuses: labels.statuses,
                taglines: labels.taglines,
                view: labels.view,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
