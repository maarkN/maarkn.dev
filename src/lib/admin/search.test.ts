import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { applicationResult, findResults, interfaceResults } from "./search";

const pt = interfaceResults(ptBR.admin, "pt-BR");
const english = interfaceResults(en.admin, "en");
const applications = [
  { id: "a1", company: "Ipê Data", role: "Senior Backend Engineer (Go)" },
  { id: "a2", company: "Orbita Labs", role: "Tech Lead" },
  { id: "a3", company: "Câmara Viva", role: null },
].map(applicationResult);

const ids = (query: string, all = [...pt, ...applications]) => findResults(all, query).map(({ id }) => id);

describe("the search of the backoffice", () => {
  it("finds screens, by name and by what else they are called", () => {
    expect(ids("vagas")).toContain("jobs");
    expect(ids("radar")).toContain("jobs");
    expect(ids("kanban")).toContain("board");
    expect(ids("fuso")).toEqual(["settings"]);
    expect(ids("configuracoes")).toEqual(["settings"]);
  });

  it("finds an application by company, without accents and in any case, and opens its dossier", () => {
    const [found] = findResults([...pt, ...applications], "IPE DATA");
    expect(found).toMatchObject({ kind: "application", title: "Ipê Data" });
    expect(found.target).toEqual({ type: "page", href: "/admin/applications/a1" });
    expect(ids("camara")).toEqual(["application-a3"]);
  });

  it("finds an application by role", () => {
    expect(ids("tech lead")).toEqual(["application-a2"]);
    expect(ids("go")).toEqual(["application-a1"]);
  });

  it("finds actions: create, theme, language, the site and the way out", () => {
    expect(ids("criar")).toEqual(["create-application", "create-project", "create-resume"]);
    expect(ids("tema").filter((id) => id.startsWith("theme-"))).toEqual(["theme-dusk", "theme-light", "theme-dracula"]);
    expect(ids("english")).toEqual(["language-en"]);
    expect(ids("sair")).toEqual(["sign-out"]);
    expect(ids("ver o site")).toContain("site");
  });

  it("offers the other language, whichever the interface is in", () => {
    const languages = (all: typeof pt) => all.filter(({ target }) => target.type === "language").map(({ target }) => target);
    expect(languages(pt)).toEqual([{ type: "language", locale: "en" }]);
    expect(languages(english)).toEqual([{ type: "language", locale: "pt-BR" }]);
    expect(ids("applications", english)[0]).toBe("applications");
  });

  it("offers only what exists: an appointment cannot be created yet", () => {
    expect(ids("compromisso")).toEqual([]);
    expect(ids("agenda")).toEqual([]);
    for (const { target } of pt) if (target.type === "page") expect(target.href).toMatch(/^\/admin/);
  });

  it("with nothing typed, suggests screens and actions, and no data", () => {
    const suggested = findResults([...pt, ...applications], "  ");
    expect(suggested).toHaveLength(pt.length);
    expect(suggested.some(({ kind }) => kind === "application")).toBe(false);
  });

  it("finds nothing when there is nothing", () => {
    expect(ids("xyzzy")).toEqual([]);
    expect(ids("!!!")).toEqual([]);
  });
});
