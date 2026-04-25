"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ProjectCard } from "./project-card";
import { projectCategories, projects, type Project, type ProjectCategory, type ProjectStatus } from "@/lib/projects";
import { cn } from "@/lib/utils";

type Labels = {
  filterAll: string;
  empty: string;
  view: string;
  categories: Record<ProjectCategory, string>;
  statuses: Record<ProjectStatus, string>;
  taglines: Record<string, string>;
};

type FilterValue = "all" | ProjectCategory;

export function ProjectsFilter({ labels, locale }: { labels: Labels; locale: string }) {
  const [active, setActive] = useState<FilterValue>("all");

  const counts = useMemo(() => {
    const map = new Map<FilterValue, number>([["all", projects.length]]);
    for (const c of projectCategories) {
      map.set(c, projects.filter((p) => p.category === c).length);
    }
    return map;
  }, []);

  const visible: Project[] =
    active === "all" ? projects : projects.filter((p) => p.category === active);

  const filters: { value: FilterValue; label: string }[] = [
    { value: "all", label: labels.filterAll },
    ...projectCategories.map((c) => ({ value: c, label: labels.categories[c] })),
  ];

  return (
    <div>
      <ul className="mb-12 flex flex-wrap items-center gap-2">
        {filters.map(({ value, label }) => {
          const isActive = value === active;
          const count = counts.get(value) ?? 0;
          return (
            <li key={value}>
              <button
                type="button"
                onClick={() => setActive(value)}
                aria-pressed={isActive}
                disabled={count === 0}
                className={cn(
                  "inline-flex items-center gap-2 border px-4 py-2 font-display text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors disabled:opacity-50",
                  isActive
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                )}
              >
                {label}
                <span
                  className={cn(
                    "font-mono text-[10px] tracking-[0.04em]",
                    isActive ? "text-white/80" : "text-[var(--muted)]"
                  )}
                >
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 ? (
        <p className="border border-dashed border-[var(--border-2)] p-10 text-center text-sm text-[var(--muted)]">
          {labels.empty}
        </p>
      ) : (
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((p, i) => (
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
        </motion.div>
      )}
    </div>
  );
}
