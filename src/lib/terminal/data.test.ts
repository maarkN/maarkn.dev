import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { newRow } from "@/lib/project-seed";
import { projects } from "@/lib/projects";

/* The `projects` command must print what the pages print: the same repository,
   in the language of the route. Only the connection is replaced. */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ghost", () => ({ getPosts: vi.fn(async () => []) }));

const findMany = vi.fn();
const dbState = { configured: true };
vi.mock("@/lib/db", () => ({
  db: { project: { findMany } },
  get dbConfigured() {
    return dbState.configured;
  },
}));

const { loadTerminalData } = await import("./data");

const featured = projects.filter((p) => p.featured);
const rows = (edit: Record<string, unknown> = {}) =>
  projects.map((p) => ({
    ...newRow(p, { withCase: false }),
    images: [],
    ...(p.slug === featured[0]!.slug ? edit : {}),
  }));

const taglines = async (lang: "en" | "pt-BR") =>
  (await loadTerminalData(lang === "en" ? en : ptBR, lang)).projects.map((p) => p.tagline);

beforeEach(() => {
  findMany.mockReset();
  dbState.configured = true;
});

describe("loadTerminalData — projects", () => {
  it("prints the summary edited in the database, in the language of the route", async () => {
    findMany.mockResolvedValue(rows({ taglinePt: "resumo editado" }));
    expect((await taglines("pt-BR"))[0]).toBe("resumo editado");
    expect((await taglines("en"))[0]).toBe(
      (en.projects.taglines as Record<string, string>)[featured[0]!.slug],
    );
  });

  it("marks a summary that only exists in the other language", async () => {
    findMany.mockResolvedValue(rows({ tagline: null, taglinePt: "só em português" }));
    const { projects: listed } = await loadTerminalData(en, "en");
    expect(listed[0]).toMatchObject({ tagline: "só em português", taglineLang: "pt-BR" });
    expect(listed[1]!.taglineLang).toBeUndefined();
  });

  it.each([
    ["en", en],
    ["pt-BR", ptBR],
  ] as const)("without a database, lists the seed in %s", async (lang, dict) => {
    dbState.configured = false;
    const seeded = dict.projects.taglines as Record<string, string>;
    expect(await taglines(lang)).toEqual(featured.map((p) => seeded[p.slug]));
  });
});
