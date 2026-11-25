import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { CREATE, currentItem, NAV, NAV_ITEMS, SHORTCUTS, trail } from "./nav";

/** Has a page of its own: what a link of the shell may point at. */
const built = (href: string) => existsSync(`src/app${href}/page.tsx`);

describe("the menu", () => {
  it("groups the screens as docs/design/backoffice.md does", () => {
    const names = ptBR.admin.nav;
    expect(NAV.map(({ key, items }) => [names.groups[key], ...items.map((item) => names.items[item.key])])).toEqual([
      ["Painel", "Visão geral", "Agenda"],
      ["Carreira", "Candidaturas", "Vagas", "Contatos", "Gerador de CV"],
      ["Site", "Projetos", "Experiências", "Notas", "Assistente"],
      ["Sistema", "MCP e chaves", "Auditoria", "Configurações"],
    ]);
  });

  it("has a name for everything, in both languages", () => {
    for (const { nav, create } of [ptBR.admin, en.admin]) {
      expect(Object.keys(nav.items).sort()).toEqual(NAV_ITEMS.map(({ key }) => key).sort());
      expect(Object.keys(nav.groups)).toEqual(NAV.map(({ key }) => key));
      expect(Object.keys(create.items)).toEqual(CREATE.map(({ key }) => key));
    }
  });

  it("only links to what exists, and links to it as soon as it does", () => {
    for (const { key, href } of [...NAV_ITEMS, ...CREATE]) {
      if (href) expect(built(href), key).toBe(true);
    }
    expect(NAV_ITEMS.filter(({ href }) => href === null).map(({ key }) => key)).toEqual(["agenda", "experiences", "notes"]);
    for (const path of ["agenda", "calendar", "experiences", "posts", "notes"]) expect(built(`/admin/${path}`), path).toBe(false);
  });

  it("offers to create an application, an appointment, a project and a resume", () => {
    expect(CREATE.map(({ key }) => ptBR.admin.create.items[key])).toEqual([
      "Candidatura",
      "Compromisso",
      "Projeto",
      "Currículo",
    ]);
  });

  it("has four shortcuts for a phone, all of them built", () => {
    expect(SHORTCUTS).toHaveLength(4);
    for (const key of SHORTCUTS) expect(NAV_ITEMS.find((item) => item.key === key)?.href, key).toBeTruthy();
  });
});

describe("currentItem", () => {
  it("is one entry, for the screen and for the ones inside it", () => {
    const at = (pathname: string) => currentItem(pathname)?.key ?? null;
    expect(at("/admin")).toBe("overview");
    expect(at("/admin/applications")).toBe("applications");
    expect(at("/admin/applications/board")).toBe("applications");
    expect(at("/admin/applications/clx1/edit")).toBe("applications");
    expect(at("/admin/chat")).toBe("assistant");
    expect(at("/admin/api-keys")).toBe("apiKeys");
    // Not by the beginning of a word.
    expect(at("/admin/jobs-archive")).toBeNull();
    expect(at("/admin/nowhere")).toBeNull();
  });
});

describe("trail", () => {
  it("is empty where the entry of the menu is the screen", () => {
    for (const { href } of NAV_ITEMS) if (href) expect(trail(href), href).toEqual([]);
    expect(trail("/admin/nowhere")).toEqual([]);
  });

  it("goes from the entry of the menu to the screen, which is not a link", () => {
    const start = { nav: "applications", href: "/admin/applications" };
    expect(trail("/admin/applications/board")).toEqual([start, { screen: "board" }]);
    expect(trail("/admin/applications/new")).toEqual([start, { screen: "newApplication" }]);
    expect(trail("/admin/applications/clx1", "Orbita Labs")).toEqual([start, { text: "Orbita Labs" }]);
  });

  it("brings the edit form back to the record", () => {
    expect(trail("/admin/applications/clx1/edit", "Orbita Labs")).toEqual([
      { nav: "applications", href: "/admin/applications" },
      { text: "Orbita Labs", href: "/admin/applications/clx1" },
      { screen: "edit" },
    ]);
  });

  it("does not link to a record that has no screen of its own", () => {
    expect(trail("/admin/projects/p1/edit", "DoctorX")).toEqual([
      { nav: "projects", href: "/admin/projects" },
      { text: "DoctorX" },
      { screen: "edit" },
    ]);
  });

  it("without a name, says what kind of record it is", () => {
    expect(trail("/admin/generator/g1", "  ").at(-1)).toEqual({ screen: "generation" });
    expect(trail("/admin/applications/clx1").at(-1)).toEqual({ screen: "application" });
  });
});
