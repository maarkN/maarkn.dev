import { describe, expect, it } from "vitest";
import { ariaCurrent, currentPage, pageHref, PAGES, sectionHref, TOP_PAGES } from "./pages";

describe("the site's map", () => {
  it("addresses pages and sections in the language of the visitor", () => {
    expect(pageHref("pt-BR", "home")).toBe("/pt-BR");
    expect(pageHref("en", "projects")).toBe("/en/projects");
    expect(sectionHref("en", "contact")).toBe("/en#contact");
    expect(PAGES).toEqual(expect.arrayContaining([...TOP_PAGES]));
  });

  it("knows which page the visitor is on, and when they are inside it", () => {
    expect(currentPage("/en")).toEqual({ page: "home", exact: true });
    expect(currentPage("/pt-BR/projects")).toEqual({ page: "projects", exact: true });
    expect(currentPage("/pt-BR/projects/")).toEqual({ page: "projects", exact: true });
    expect(currentPage("/en/blog/a-post")).toEqual({ page: "blog", exact: false });
    expect(currentPage("/en/nowhere")).toBeNull();
    // Not a page by having its name at the start.
    expect(currentPage("/en/projectsx")).toBeNull();
  });

  it("marks the current one, and only that one", () => {
    expect(ariaCurrent("/en/projects", "projects")).toBe("page");
    expect(ariaCurrent("/en/projects/x", "projects")).toBe("true");
    expect(ariaCurrent("/en/projects/x", "career")).toBeUndefined();
    // Everything is under the home, and that does not make it current.
    expect(ariaCurrent("/en/projects", "home")).toBeUndefined();
  });
});
