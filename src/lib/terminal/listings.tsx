import type { ReactNode } from "react";
import { A, B, D, G, O, P, Row } from "@/components/terminal/primitives";
import type { ProjectCategory, ProjectStatus } from "@/lib/projects";

/*
 * Pure renderers for the three content listings. The inner pages
 * (`/projects`, `/career`, `/blog`) print them on the server; the terminal
 * commands `projects`, `experience` and `writing` print the same lines on
 * the client — one source for the look of a list entry. Every input is a
 * plain serialisable object so the data can travel as props.
 */

/* ── projects ──────────────────────────────────────────────────── */

export type ProjectListItem = {
  slug: string;
  name: string;
  year: string;
  category: ProjectCategory;
  status: ProjectStatus;
  stack: string[];
  /** Short description already resolved for the locale. */
  tagline: string;
};

export type ProjectListLabels = {
  categories: Record<ProjectCategory, string>;
  statuses: Record<ProjectStatus, string>;
};

/** `● live` in the colour of the status (green / orange / purple / dim). */
export function projectStatus(
  status: ProjectStatus,
  statuses: Record<ProjectStatus, string>,
): ReactNode {
  const text = `● ${statuses[status]}`;
  switch (status) {
    case "live":
      return <G>{text}</G>;
    case "nda":
      return <O>{text}</O>;
    case "internal":
      return <P>{text}</P>;
    default:
      return <D>{text}</D>;
  }
}

/**
 * `[n] slug · year · category ● status` / description / stack, numbered
 * from 1 in the order given.
 */
export function projectsLines(
  projects: ProjectListItem[],
  { lang, categories, statuses }: ProjectListLabels & { lang: string },
): ReactNode[] {
  return projects.map((p, n) => (
    <Row key={p.slug} width="w4" entry label={<P>[{n + 1}]</P>}>
      <A href={`/${lang}/projects/${p.slug}`}>{p.slug}</A>{" "}
      <D>
        {p.year} · {categories[p.category]}
      </D>{" "}
      {projectStatus(p.status, statuses)}
      <br />
      {p.tagline}
      <br />
      <D>{p.stack.join(" · ")}</D>
    </Row>
  ));
}

/* ── experience ────────────────────────────────────────────────── */

export type ExperienceItem = {
  slug: string;
  period: string;
  company: string;
  role: string;
  summary: string;
  current?: boolean;
};

/**
 * `period │ role · company` / summary / `read full case ↗`, newest first
 * as given. Each entry carries `id=<slug>` so `/career#<slug>` lands on it;
 * the terminal passes `anchors: false` since it may print the list twice.
 */
export function experienceLines(
  items: ExperienceItem[],
  { lang, readCase, anchors = true }: { lang: string; readCase: string; anchors?: boolean },
): ReactNode[] {
  return items.map((job) => (
    <div key={job.slug} id={anchors ? job.slug : undefined} style={{ scrollMarginTop: 48 }}>
      <Row width="w18" entry label={job.period}>
        <B>{job.role}</B> <D>· {job.company}</D>
        <br />
        {job.summary}
        <br />
        <A quiet href={`/${lang}/career/${job.slug}`}>
          {readCase}
        </A>
      </Row>
    </div>
  ));
}

/* ── writing ───────────────────────────────────────────────────── */

export type WritingItem = {
  slug: string;
  title: string;
  /** Tag names, already in display form. */
  tags: string[];
  /** ISO date; only `YYYY-MM` is shown. */
  publishedAt: string;
  readingTime: number;
};

/** `[n] title` / `tag · YYYY-MM · N min read`. */
export function writingLines(
  posts: WritingItem[],
  { lang, minRead }: { lang: string; minRead: string },
): ReactNode[] {
  return posts.map((post, n) => (
    <Row key={post.slug} width="w4" entry label={<P>[{n + 1}]</P>}>
      <A href={`/${lang}/blog/${post.slug}`}>{post.title}</A>
      <br />
      <D>
        {[
          post.tags.join(" · ") || null,
          post.publishedAt.slice(0, 7),
          `${post.readingTime || 1} ${minRead}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </D>
    </Row>
  ));
}
