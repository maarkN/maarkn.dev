import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { httpHref } from "@/lib/http-url";
import { decodeStringList } from "@/lib/json-list";
import {
  projects as staticProjects,
  projectCategories,
  type Project,
  type ProjectCategory,
  type ProjectStatus,
  type SourceVisibility,
} from "@/lib/projects";

/** A project enriched with the long-form content stored in the DB columns. */
export type RepoProject = Project & {
  tagline: string | null;
  description: string | null;
  role: string | null;
  features: string[];
};

type ProjectRow = Awaited<ReturnType<typeof db.project.findMany>>[number];

function rowToProject(row: ProjectRow): RepoProject {
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
    tagline: row.tagline ?? null,
    description: row.description ?? null,
    role: row.role ?? null,
    features: decodeStringList(row.featuresJson),
  };
}

function staticToRepo(p: Project): RepoProject {
  return { ...p, tagline: null, description: null, role: null, features: [] };
}

/** All projects, DB-first with a static fallback. Deduped within a request. */
export const getAllProjects = cache(async (): Promise<RepoProject[]> => {
  try {
    const rows = await db.project.findMany({
      orderBy: [{ featured: "desc" }, { year: "desc" }, { createdAt: "asc" }],
    });
    if (rows.length === 0) return staticProjects.map(staticToRepo);
    return rows.map(rowToProject);
  } catch (err) {
    console.error("[projects-repo] DB read failed; using static fallback", err);
    return staticProjects.map(staticToRepo);
  }
});

export const getFeaturedProjects = cache(async (): Promise<RepoProject[]> => {
  return (await getAllProjects()).filter((p) => p.featured);
});

export async function getProjectBySlug(slug: string): Promise<RepoProject | null> {
  return (await getAllProjects()).find((p) => p.slug === slug) ?? null;
}

/**
 * Tagline map for cards: dictionary copy wins for the known slugs (bilingual);
 * projects added through the admin fall back to their DB tagline.
 */
export function buildTaglines(
  projects: RepoProject[],
  dictTaglines: Record<string, string>
): Record<string, string> {
  const map: Record<string, string> = { ...dictTaglines };
  for (const p of projects) {
    if (!map[p.slug]) map[p.slug] = p.tagline ?? "";
  }
  return map;
}

export { projectCategories };
