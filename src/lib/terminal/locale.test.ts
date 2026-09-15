// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { localizedHref, otherLocale, parseLocaleArg, shortLocale, switchLocale } from "./locale";

describe("locale helpers", () => {
  it("parses the ways a visitor may spell a language", () => {
    expect(parseLocaleArg("pt")).toBe("pt-BR");
    expect(parseLocaleArg("PT-br")).toBe("pt-BR");
    expect(parseLocaleArg("br")).toBe("pt-BR");
    expect(parseLocaleArg("en")).toBe("en");
    expect(parseLocaleArg("en-US")).toBe("en");
    expect(parseLocaleArg("fr")).toBeNull();
    expect(parseLocaleArg(undefined)).toBeNull();
    expect(parseLocaleArg("")).toBeNull();
  });

  it("toggles and abbreviates", () => {
    expect(otherLocale("en")).toBe("pt-BR");
    expect(otherLocale("pt-BR")).toBe("en");
    expect(shortLocale("en")).toBe("en");
    expect(shortLocale("pt-BR")).toBe("pt");
  });

  it("swaps the locale prefix and keeps the query string", () => {
    expect(localizedHref("/en", "?cmd=skills", "pt-BR")).toBe("/pt-BR?cmd=skills");
    expect(localizedHref("/pt-BR/blog/post", "", "en")).toBe("/en/blog/post");
    expect(localizedHref("/", "", "pt-BR")).toBe("/pt-BR");
    expect(localizedHref("/projects", "cat=ai", "en")).toBe("/en/projects?cat=ai");
  });

  it("switchLocale remembers the choice and moves to the same page under the other prefix", () => {
    window.history.replaceState(null, "", "/en?cmd=skills");
    const navigate = vi.fn();
    switchLocale("pt-BR", navigate);
    expect(navigate).toHaveBeenCalledWith("/pt-BR?cmd=skills");
    expect(document.cookie).toContain("locale=pt-BR");
  });
});
