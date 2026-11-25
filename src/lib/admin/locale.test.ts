import { describe, expect, it } from "vitest";
import { isAdminLocale, resolveAdminLocale } from "./locale";

describe("resolveAdminLocale", () => {
  it("is the backoffice's own choice, whatever the site and the browser say", () => {
    expect(resolveAdminLocale({ own: "en", site: "pt-BR", acceptLanguage: "pt-BR" })).toBe("en");
    expect(resolveAdminLocale({ own: "pt-BR", site: "en", acceptLanguage: "en-US" })).toBe("pt-BR");
  });

  it("begins with the language of the site", () => {
    expect(resolveAdminLocale({ site: "en", acceptLanguage: "pt-BR,pt;q=0.9" })).toBe("en");
    expect(resolveAdminLocale({ site: "pt-BR", acceptLanguage: "en-US,en;q=0.9" })).toBe("pt-BR");
  });

  it("without either, is the first language of the browser that it speaks", () => {
    expect(resolveAdminLocale({ acceptLanguage: "pt-BR,pt;q=0.9,en;q=0.8" })).toBe("pt-BR");
    expect(resolveAdminLocale({ acceptLanguage: "pt-PT" })).toBe("pt-BR");
    expect(resolveAdminLocale({ acceptLanguage: "en-GB,en;q=0.9" })).toBe("en");
    expect(resolveAdminLocale({ acceptLanguage: "fr-FR, pt;q=0.4, en;q=0.7" })).toBe("en");
    expect(resolveAdminLocale({ acceptLanguage: "fr, en;q=0, pt;q=0.1" })).toBe("pt-BR");
  });

  it("with nothing to go by, is English, as the site is", () => {
    for (const acceptLanguage of [undefined, null, "", "fr-FR,de;q=0.8", "*", ";;q=x,"]) {
      expect(resolveAdminLocale({ acceptLanguage })).toBe("en");
    }
  });

  it("does not take a cookie it does not know for a choice", () => {
    expect(resolveAdminLocale({ own: "pt", site: "de", acceptLanguage: "pt-BR" })).toBe("pt-BR");
    expect(resolveAdminLocale({ own: "EN", site: "pt-BR" })).toBe("pt-BR");
    expect(isAdminLocale("toString")).toBe(false);
  });
});
