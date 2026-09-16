import { describe, expect, it, vi } from "vitest";
import { timeline } from "@/lib/timeline";
import sitemap from "./sitemap";

/* The loaders touch Ghost and the DB; both are replaced so the test proves
   the sitemap's shape, not the backends. The project slugs are deliberately
   absent from the static catalogue: the DB-first list must win, as it does
   on the pages. */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ghost", () => ({
  getPosts: vi.fn(async () => [{ slug: "hello-world" }, { slug: "second-post" }]),
}));
vi.mock("@/lib/projects-repo", () => ({
  getAllProjects: vi.fn(async () => [{ slug: "db-only-project" }, { slug: "another-db-project" }]),
}));

const paths = async () => (await sitemap()).map((e) => new URL(e.url).pathname);

describe("sitemap", () => {
  it("lists /projects in both locales and never /chat", async () => {
    const urls = await paths();
    expect(urls).toContain("/en/projects");
    expect(urls).toContain("/pt-BR/projects");
    expect(urls.some((u) => u.includes("/chat"))).toBe(false);
  });

  it("lists home, the four listings, projects, career and posts per locale", async () => {
    const urls = await paths();
    for (const l of ["en", "pt-BR"]) {
      for (const p of ["", "/projects", "/career", "/blog", "/links"]) {
        expect(urls).toContain(`/${l}${p}`);
      }
      expect(urls).toContain(`/${l}/projects/db-only-project`);
      expect(urls).toContain(`/${l}/blog/hello-world`);
      for (const t of timeline) expect(urls).toContain(`/${l}/career/${t.slug}`);
    }
    // 1 home + 4 listings + 2 projects + N career + 2 posts, times 2 locales
    expect(urls).toHaveLength((1 + 4 + 2 + timeline.length + 2) * 2);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("uses the same project list as the pages (DB rows replace the static catalogue)", async () => {
    const urls = await paths();
    const { projects } = await import("@/lib/projects");
    for (const p of projects) expect(urls).not.toContain(`/en/projects/${p.slug}`);
  });

  it("declares hreflang alternates for both locales on every entry", async () => {
    for (const entry of await sitemap()) {
      const path = new URL(entry.url).pathname.replace(/^\/(en|pt-BR)/, "");
      expect(entry.alternates?.languages).toEqual({
        en: `https://maarkn.dev/en${path}`,
        "pt-BR": `https://maarkn.dev/pt-BR${path}`,
      });
    }
  });
});
