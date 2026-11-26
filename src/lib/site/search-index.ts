import "server-only";
import type { Dictionary, Locale } from "@/i18n/config";
import { langAttr } from "@/lib/project-text";
import { getAllProjects } from "@/lib/projects-repo";
import { site } from "@/lib/site";
import { SITE_THEMES } from "@/lib/site-theme";
import { terminalHref } from "@/lib/terminal/address";
import { timeline } from "@/lib/timeline";
import { PAGES, pageHref, SECTIONS, sectionHref } from "./pages";
import { SEARCH_KINDS, type SearchItem } from "./search";

/**
 * What the search finds, in one language, from the same sources as the pages:
 * a project that enters the portfolio enters the search. Plain data.
 */
export async function buildSearchIndex(dict: Dictionary, locale: Locale): Promise<SearchItem[]> {
  const t = dict.site;
  const { terms } = t.search;
  const projects = await getAllProjects(locale);
  const roles = dict.about.timeline as Record<string, { role: string; summary: string }>;
  const other = locale === "en" ? "pt-BR" : "en";

  const items: SearchItem[] = [
    ...SECTIONS.map((section) => ({
      id: `section-${section}`,
      kind: "section" as const,
      title: t.sections[section],
      terms: terms.sections[section],
      target: { type: "page" as const, href: sectionHref(locale, section) },
    })),
    ...PAGES.map((page) => ({
      id: `page-${page}`,
      kind: "page" as const,
      title: t.pages[page],
      terms: terms.pages[page],
      target: { type: "page" as const, href: pageHref(locale, page) },
    })),
    {
      id: "cli",
      kind: "cli",
      title: t.cli,
      terms: terms.cli,
      target: { type: "page", href: terminalHref(locale) },
    },
    ...projects.map((project) => ({
      id: `project-${project.slug}`,
      kind: "project" as const,
      title: project.name,
      detail: project.tagline?.value || undefined,
      detailLang: langAttr(project.tagline, locale),
      terms: [...project.stack, dict.projects.categories[project.category], project.year],
      target: { type: "page" as const, href: `${pageHref(locale, "projects")}/${project.slug}` },
    })),
    ...timeline.map((entry) => ({
      id: `experience-${entry.slug}`,
      kind: "experience" as const,
      title: entry.company,
      detail: [roles[entry.key]?.role, entry.period].filter(Boolean).join(" · "),
      terms: [...entry.tech, roles[entry.key]?.role ?? ""].filter(Boolean),
      target: { type: "page" as const, href: `${pageHref(locale, "career")}/${entry.slug}` },
    })),
    ...SITE_THEMES.map((theme) => ({
      id: `theme-${theme}`,
      kind: "theme" as const,
      title: t.theme.names[theme],
      terms: [theme, ...terms.themes[theme]],
      target: { type: "theme" as const, theme },
    })),
    {
      id: "language",
      kind: "language",
      title: t.language.names[other],
      lang: other,
      terms: terms.languages[other],
      target: { type: "language" },
    },
    {
      id: "cv",
      kind: "cv",
      title: dict.links.links.cv.label,
      terms: terms.cv,
      target: { type: "file", href: site.cvPath },
    },
  ];
  return items.sort((a, b) => SEARCH_KINDS.indexOf(a.kind) - SEARCH_KINDS.indexOf(b.kind));
}
