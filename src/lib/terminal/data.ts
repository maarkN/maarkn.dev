import "server-only";
import type { Dictionary } from "@/i18n/config";
import { getPosts } from "@/lib/ghost";
import { buildTaglines, getFeaturedProjects } from "@/lib/projects-repo";
import { timeline } from "@/lib/timeline";
import { groupOrder, metrics, toolkit } from "@/lib/toolkit";
import type { TerminalData } from "./types";

/** How many posts `writing` lists. */
const WRITING_LIMIT = 6;

/**
 * Assembles `TerminalData` from the same sources the inner pages use:
 * projects from the repository (DB with static fallback), posts from the
 * CMS (mocks when it is unavailable), timeline + toolkit constants merged
 * with the dictionary copy. Runs on the server; the result is plain data.
 */
export async function loadTerminalData(dict: Dictionary): Promise<TerminalData> {
  const [featured, posts] = await Promise.all([getFeaturedProjects(), getPosts(WRITING_LIMIT)]);
  const taglines = buildTaglines(featured, dict.projects.taglines);
  const copy = dict.about.timeline as Record<string, { role: string; summary: string }>;
  const n = dict.bigNumbers.items;

  return {
    numbers: {
      years: n.years.value,
      products: n.projects.value,
      stacks: n.stacks.value,
      countries: n.countries.value,
    },
    experience: timeline.map((entry) => ({
      slug: entry.slug,
      period: entry.period,
      company: entry.company,
      role: copy[entry.key]?.role ?? entry.company,
      summary: copy[entry.key]?.summary ?? "",
      current: entry.current,
    })),
    skills: {
      groups: groupOrder.map((key) => ({ key, items: toolkit[key].map((tool) => tool.name) })),
      metrics: metrics.map((metric) => ({
        label: dict.toolkit.metrics.items[metric.key],
        value: metric.value,
      })),
    },
    projects: featured.map((project) => ({
      slug: project.slug,
      name: project.name,
      year: project.year,
      category: project.category,
      status: project.status,
      stack: project.stack,
      tagline: taglines[project.slug] ?? "",
    })),
    projectLabels: { categories: dict.projects.categories, statuses: dict.projects.statuses },
    posts: posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      tags: post.tags.map((tag) => tag.name),
      publishedAt: post.publishedAt,
      readingTime: post.readingTime,
    })),
    minRead: dict.blog.readingTime,
  };
}
