import "server-only";
import { cache } from "react";
import type { Locale } from "@/i18n/config";
import { db, dbConfigured } from "@/lib/db";
import { httpHref } from "@/lib/http-url";
import { decodeStringList } from "@/lib/json-list";
import {
  MAX_SUCCESS_CASES,
  resolveCaption,
  resolveCase,
  resolveText,
  seedCaption,
  seedCasePosition,
  storedCaseText,
  storedText,
  type Localized,
  type ResolvedCase,
  type ResolvedText,
} from "@/lib/project-text";
import {
  projects as staticProjects,
  projectCategories,
  type Project,
  type ProjectCategory,
  type ProjectStatus,
  type SourceVisibility,
} from "@/lib/projects";

/** One image of the gallery. Without a `url` it is a stylized placeholder. */
export type RepoImage = {
  url: string;
  caption: Localized<string> | null;
  monogram?: string;
};

/**
 * A project with its text resolved for one language. Each piece carries the
 * language it is written in, because a project with text in one language only
 * is shown in that one.
 */
export type RepoProject = Omit<Project, "gallery"> &
  ResolvedText & {
    gallery: RepoImage[];
    /** Set when the project is a success case of the home. */
    successCase: ResolvedCase | null;
  };

/** Deduped within a request; `null` means "use the seed". */
const readRows = cache(async () => {
  if (!dbConfigured) return null;
  try {
    const rows = await db.project.findMany({
      include: { images: { orderBy: { position: "asc" } } },
      orderBy: [{ featured: "desc" }, { year: "desc" }, { createdAt: "asc" }],
    });
    return rows.length > 0 ? rows : null;
  } catch (err) {
    console.error("[projects-repo] DB read failed; using the seed", err);
    return null;
  }
});

type ProjectRow = NonNullable<Awaited<ReturnType<typeof readRows>>>[number];

/**
 * A path on this site, or nothing. Second lock, like `httpHref` below: next/image
 * throws on a host it does not know, and one bad row would take the page down.
 */
function sitePath(path: string): string | null {
  return /^\/(?![/\\])[^\s\\]*$/.test(path) && !path.includes("..") ? path : null;
}

function rowToProject(row: ProjectRow, lang: Locale): RepoProject {
  return {
    slug: row.slug,
    name: row.name,
    year: row.year,
    category: row.category as ProjectCategory,
    status: row.status as ProjectStatus,
    featured: row.featured,
    monogram: row.monogram,
    accent: { from: row.accentFrom, to: row.accentTo },
    stack: decodeStringList(row.stackJson),
    sourceVisibility: (row.sourceVisibility as SourceVisibility) ?? "public",
    // Second lock on the schemes, on the read side: these three columns become
    // `href` on the public site, and rows written before `httpUrlSchema`
    // existed (or written straight into the DB) were never checked. Anything
    // that is not http(s) — `javascript:`, `data:`, `vbscript:` — is dropped
    // here instead of reaching a renderer we have to trust.
    links: {
      repo: httpHref(row.repoUrl),
      demo: httpHref(row.demoUrl),
      case: httpHref(row.caseUrl),
    },
    coverImage: row.coverImage ?? null,
    ...resolveText(lang, row.slug, storedText(row)),
    gallery: row.images.flatMap((image) => {
      const url = sitePath(image.path);
      if (!url) return [];
      const captions = { en: image.captionEn, "pt-BR": image.captionPt };
      return [{ url, caption: resolveCaption(lang, captions) }];
    }),
    successCase: resolveCase(lang, row.slug, row.casePosition, storedCaseText(row)),
  };
}

function seedToProject({ gallery = [], ...project }: Project, lang: Locale): RepoProject {
  return {
    ...project,
    ...resolveText(lang, project.slug, null),
    gallery: gallery.map(({ url, captionKey, monogram }) => ({
      url,
      caption: resolveCaption(lang, seedCaption(project.slug, captionKey)),
      monogram,
    })),
    successCase: resolveCase(lang, project.slug, seedCasePosition(project.slug), null),
  };
}

const curatedIndex = new Map(staticProjects.map((p, i) => [p.slug, i]));

/**
 * Featured first, then the order of the curated list in `lib/projects.ts`;
 * projects that only exist in the DB (created in the admin) go last, newest
 * year first. Stable, so ties keep the DB order.
 */
export function sortByCuratedOrder<T extends { slug: string; featured: boolean; year: string }>(
  items: T[]
): T[] {
  const position = (slug: string) => curatedIndex.get(slug) ?? Number.POSITIVE_INFINITY;
  return [...items].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const byList = position(a.slug) - position(b.slug);
    if (byList !== 0 && Number.isFinite(byList)) return byList;
    if (Number.isFinite(position(a.slug)) !== Number.isFinite(position(b.slug))) {
      return Number.isFinite(position(a.slug)) ? -1 : 1;
    }
    return b.year.localeCompare(a.year);
  });
}

/**
 * All projects in one language. The database wins; without it, or when it fails
 * or has no project, the seed in the repository (ADR 0003).
 */
export const getAllProjects = cache(async (lang: Locale): Promise<RepoProject[]> => {
  const rows = await readRows();
  if (!rows) return staticProjects.map((project) => seedToProject(project, lang));
  return sortByCuratedOrder(rows.map((row) => rowToProject(row, lang)));
});

export const getFeaturedProjects = cache(async (lang: Locale): Promise<RepoProject[]> => {
  return (await getAllProjects(lang)).filter((p) => p.featured);
});

export async function getProjectBySlug(slug: string, lang: Locale): Promise<RepoProject | null> {
  return (await getAllProjects(lang)).find((p) => p.slug === slug) ?? null;
}

/** The success cases of the home, in the order Marco chose; at most three. */
export async function getSuccessCases(
  lang: Locale,
): Promise<(RepoProject & { successCase: ResolvedCase })[]> {
  return (await getAllProjects(lang))
    .flatMap((p) => (p.successCase ? [{ ...p, successCase: p.successCase }] : []))
    .sort((a, b) => a.successCase.position - b.successCase.position)
    .slice(0, MAX_SUCCESS_CASES);
}

export { projectCategories };
