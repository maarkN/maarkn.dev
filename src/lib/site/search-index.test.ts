import { describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { projects } from "@/lib/projects";
import { SITE_THEMES } from "@/lib/site-theme";
import { timeline } from "@/lib/timeline";
import { PAGES, SECTIONS } from "./pages";
import { search, SEARCH_KINDS } from "./search";
import { buildSearchIndex } from "./search-index";

vi.mock("server-only", () => ({}));
// The repository is the pages' own; here it answers as it does without a database.
vi.mock("@/lib/db", () => ({ db: {}, dbConfigured: false }));

const DICTIONARIES = [
  ["en", en],
  ["pt-BR", ptBR as typeof en],
] as const;

describe.each(DICTIONARIES)("search index in %s", (locale, dict) => {
  it("has sections, pages, projects, experiences, themes, language, CV and the CLI version", async () => {
    const index = await buildSearchIndex(dict, locale);
    const count = (kind: string) => index.filter((item) => item.kind === kind).length;
    expect(Object.fromEntries(SEARCH_KINDS.map((kind) => [kind, count(kind)]))).toEqual({
      section: SECTIONS.length,
      page: PAGES.length,
      cli: 1,
      project: projects.length,
      experience: timeline.length,
      theme: SITE_THEMES.length,
      language: 1,
      cv: 1,
    });
    expect(new Set(index.map(({ id }) => id)).size).toBe(index.length);
    for (const { title, terms } of index) {
      expect(title).toBeTruthy();
      expect(terms.every((term) => typeof term === "string" && term)).toBe(true);
    }
  });

  it("only points at this language, and at the other one to switch", async () => {
    const index = await buildSearchIndex(dict, locale);
    for (const { target } of index) {
      if (target.type === "page") expect(target.href).toMatch(new RegExp(`^/${locale}(/|#|$)`));
    }
    const [language] = index.filter(({ kind }) => kind === "language");
    expect(language.lang).toBe(locale === "en" ? "pt-BR" : "en");
  });

  it("describes each project with its tagline in this language", async () => {
    const index = await buildSearchIndex(dict, locale);
    const taglines = dict.projects.taglines as Record<string, string>;
    for (const { slug } of projects) {
      const item = index.find(({ id }) => id === `project-${slug}`)!;
      expect(item.detail).toBe(taglines[slug]);
      expect(item.detailLang).toBeUndefined();
    }
  });

  it("finds the projects and the experiences with Flutter", async () => {
    const index = await buildSearchIndex(dict, locale);
    const found = search(index, "flutter").map(({ id }) => id);
    const expected = [
      ...projects.filter(({ stack }) => stack.includes("Flutter")).map(({ slug }) => `project-${slug}`),
      ...timeline.filter(({ tech }) => tech.includes("Flutter")).map(({ slug }) => `experience-${slug}`),
    ];
    expect(expected.length).toBeGreaterThan(3);
    expect(found).toEqual(expect.arrayContaining(expected));
  });
});

describe("what people call things", () => {
  const first = async (locale: "en" | "pt-BR", query: string) =>
    search(await buildSearchIndex(locale === "en" ? en : (ptBR as typeof en), locale), query)[0]?.id;

  it("finds them by those names, in each language", async () => {
    expect(await first("pt-BR", "curriculo")).toBe("cv");
    expect(await first("en", "resume")).toBe("cv");
    expect(await first("pt-BR", "ingles")).toBe("language");
    expect(await first("en", "portuguese")).toBe("language");
    expect(await first("pt-BR", "claro")).toBe("theme-light");
    expect(await first("en", "terminal")).toBe("cli");
    expect(await first("pt-BR", "whatsapp")).toBe("section-contact");
    expect(await first("pt-BR", "versao cli")).toBe("cli");
  });
});
