import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { locales } from "@/i18n/config";
import { getPosts } from "@/lib/ghost";
import { projects as staticProjects } from "@/lib/projects";
import { getAllProjects } from "@/lib/projects-repo";
import { timeline } from "@/lib/timeline";

/*
 * Every public route in both locales with hreflang alternates: home, the four
 * listings, each project case, each career entry and each post. `/chat` is a
 * redirect to the terminal and stays out. Projects come from the same
 * DB-first loader as the pages (`getAllProjects` replaces the static list
 * once the admin has rows, so listing and sitemap always agree); career is
 * the static timeline; posts come from Ghost through the same cached loader
 * as the blog. The sitemap is regenerated hourly instead of frozen at build
 * time.
 */
export const revalidate = 3600;

type Entry = { path: string; changeFrequency: "weekly" | "monthly"; priority: number };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [posts, projects] = await Promise.all([
    getPosts(50).catch(() => []),
    getAllProjects().catch(() => staticProjects),
  ]);

  const entries: Entry[] = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    ...["/projects", "/career", "/blog", "/links"].map((path) => ({
      path,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...projects.map((p) => ({
      path: `/projects/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...timeline.map((t) => ({
      path: `/career/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...posts.map((post) => ({
      path: `/blog/${post.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  return entries.flatMap(({ path, changeFrequency, priority }) =>
    locales.map((l) => ({
      url: `${SITE_URL}/${l}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((ll) => [ll, `${SITE_URL}/${ll}${path}`]),
        ),
      },
    })),
  );
}
