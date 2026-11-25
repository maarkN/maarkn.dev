import { describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";

vi.mock("server-only", () => ({}));
const { getAdminDictionary, getDictionary } = await import("./config");

describe("the dictionary of the backoffice", () => {
  it("never reaches a page of the site", async () => {
    for (const locale of ["en", "pt-BR"] as const) {
      const dict = await getDictionary(locale);
      expect(Object.keys(dict)).not.toContain("admin");
      expect(dict.site.skip).toBeTruthy();
    }
  });

  it("is loaded apart, in the language asked for", async () => {
    expect(await getAdminDictionary("en")).toEqual(en.admin);
    expect(await getAdminDictionary("pt-BR")).toEqual(ptBR.admin);
  });

  it("has every text in both: no Portuguese left in the English one", () => {
    const texts = (value: unknown): string[] =>
      typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(texts) : [];
    expect(texts(en.admin).length).toBe(texts(ptBR.admin).length);
    // Both languages are called by their own names.
    const own = texts(en.admin.account.languages);
    for (const text of texts(en.admin)) {
      if (!own.includes(text)) expect(text).not.toMatch(/[áàâãéêíóôõúç]/i);
    }
  });
});
