import { getDictionary, hasLocale, defaultLocale, type Locale } from "@/i18n/config";
import { OG_CONTENT_TYPE, OG_SIZE, terminalOgImage } from "@/lib/og";
import { getProjectBySlug } from "@/lib/projects-repo";
import { site } from "@/lib/site";

export const alt = "Marco Filho — project case";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** `cat projects/<slug>.md` as a social card: name, tagline, stack. */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const l: Locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(l);
  const project = await getProjectBySlug(slug);
  const p = dict.projects;

  if (!project) {
    return terminalOgImage({
      locale: l,
      path: "~/projects",
      command: `cat projects/${slug}.md`,
      title: p.page.title,
      subtitle: site.name,
    });
  }

  const tagline = (p.taglines as Record<string, string>)[slug] ?? project.tagline ?? "";
  return terminalOgImage({
    locale: l,
    path: `~/projects/${slug}`,
    command: `cat projects/${slug}.md`,
    title: project.name,
    subtitle: tagline,
    lines: [
      `${project.year} · ${p.categories[project.category]}`,
      project.stack.join(" · "),
    ],
  });
}
