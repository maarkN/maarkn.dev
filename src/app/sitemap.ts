import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { locales } from "@/i18n/config";
import { projects } from "@/lib/projects";

// Static sitemap generated at build time. Localized + hreflang alternates for
// every stable route plus each project case. (Blog/career detail slugs are
// intentionally left out to keep the sitemap independent of the DB / Ghost.)
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPaths = ["", "/projects", "/blog", "/career", "/links", "/chat"];
  const projectPaths = projects.map((p) => `/projects/${p.slug}`);
  const paths = [...staticPaths, ...projectPaths];

  return paths.flatMap((path) =>
    locales.map((l) => ({
      url: `${SITE_URL}/${l}${path}`,
      lastModified: now,
      changeFrequency:
        path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path.startsWith("/projects/") ? 0.6 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          locales.map((ll) => [ll, `${SITE_URL}/${ll}${path}`]),
        ),
      },
    })),
  );
}
