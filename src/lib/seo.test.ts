import { describe, expect, it } from "vitest";
import { personLd, routeAlternates, websiteLd } from "./seo";

// Mirrors `locales` in i18n/config (server-only, so not importable here).
const locales = ["en", "pt-BR"] as const;

describe("routeAlternates", () => {
  it("declares canonical + hreflang for both locales and x-default on the home", () => {
    expect(routeAlternates("pt-BR")).toEqual({
      canonical: "/pt-BR",
      languages: { en: "/en", "pt-BR": "/pt-BR", "x-default": "/en" },
    });
  });

  it("keeps the locale-less path on every alternate of an inner route", () => {
    const alt = routeAlternates("en", "/projects/x");
    expect(alt.canonical).toBe("/en/projects/x");
    expect(alt.languages).toEqual({
      en: "/en/projects/x",
      "pt-BR": "/pt-BR/projects/x",
      "x-default": "/en/projects/x",
    });
  });

  it("covers every configured locale", () => {
    const languages = routeAlternates("en", "/blog").languages as Record<string, string>;
    for (const l of locales) expect(languages[l]).toBe(`/${l}/blog`);
  });
});

describe("JSON-LD", () => {
  it("localises the Person job title and points at the route's OG image", () => {
    const en = personLd("en");
    const pt = personLd("pt-BR");
    expect(en["@type"]).toBe("Person");
    expect(en.jobTitle).not.toBe(pt.jobTitle);
    expect(pt.image).toBe("https://maarkn.dev/pt-BR/opengraph-image");
    expect(websiteLd()["@type"]).toBe("WebSite");
  });
});
