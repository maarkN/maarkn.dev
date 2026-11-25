import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { getAdminFormat, getAdminLabels, getAdminSettings } from "./request";

vi.mock("server-only", () => ({}));

let jar: Record<string, string>;
let acceptLanguage: string | null;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name in jar ? { name, value: jar[name] } : undefined) }),
  headers: async () => new Headers(acceptLanguage === null ? {} : { "accept-language": acceptLanguage }),
}));

beforeEach(() => {
  jar = {};
  acceptLanguage = null;
});

describe("the request being answered", () => {
  it("is in the language of its own cookie, then the site's, then the browser's", async () => {
    const language = async () => (await getAdminSettings()).locale;
    expect(await language()).toBe("en");
    acceptLanguage = "pt-BR,pt;q=0.9";
    expect(await language()).toBe("pt-BR");
    jar.locale = "en";
    expect(await language()).toBe("en");
    jar["admin-locale"] = "pt-BR";
    expect(await language()).toBe("pt-BR");
  });

  it("is in the time zone of its cookie, and without one in São Paulo's", async () => {
    expect((await getAdminSettings()).timeZone).toBe("America/Sao_Paulo");
    jar["admin-time-zone"] = "Asia/Tokyo";
    expect((await getAdminSettings()).timeZone).toBe("Asia/Tokyo");
  });

  it("gets the texts and the formatters of both", async () => {
    jar = { "admin-locale": "pt-BR" };
    expect(await getAdminLabels()).toEqual(ptBR.admin);
    expect((await getAdminFormat()).formatDateTime("2026-08-04T01:30:00Z")).toBe("03/08/2026, 22:30");
    jar = { "admin-locale": "en", "admin-time-zone": "Asia/Tokyo" };
    expect(await getAdminLabels()).toEqual(en.admin);
    expect((await getAdminFormat()).formatDateTime("2026-08-04T01:30:00Z")).toBe("Aug 4, 2026, 10:30");
  });
});
