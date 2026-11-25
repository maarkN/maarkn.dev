import { describe, expect, it } from "vitest";
import { fold, search, type SearchItem } from "./search";

const item = (id: string, kind: SearchItem["kind"], title: string, rest: Partial<SearchItem> = {}): SearchItem => ({
  id,
  kind,
  title,
  terms: [],
  target: { type: "page", href: `/en/${id}` },
  ...rest,
});

const ITEMS = [
  item("contact", "section", "Contato", { terms: ["e-mail"] }),
  item("career", "page", "Carreira", { terms: ["experiência"] }),
  item("projects", "page", "Projetos"),
  item("shifts", "project", "DoctorX", { detail: "Plantões médicos", terms: ["NestJS", "PostgreSQL + PostGIS", "Flutter"] }),
  item("goias", "project", "Mapa de Goiás", { terms: ["Next.js", "Category"] }),
  item("crm", "project", "CRM", { detail: "Reescrito do zero", terms: ["Go", "Apache Kafka"] }),
  item("acme", "experience", "Acme", { terms: ["Flutter", "Node.js"] }),
  item("dracula", "theme", "Dracula", { terms: ["tema"] }),
  item("cv", "cv", "Baixar CV", { terms: ["currículo"] }),
];

const ids = (query: string) => search(ITEMS, query).map(({ id }) => id);

describe("search", () => {
  it("ignores accents and case, on both sides", () => {
    expect(fold("Experiência ÇÃO")).toBe("experiencia cao");
    expect(ids("EXPERIENCIA")).toEqual(["career"]);
    expect(ids("experiência")).toEqual(["career"]);
    expect(ids("curriculo")).toEqual(["cv"]);
    expect(ids("plantoes")).toEqual(["shifts"]);
  });

  it("finds by technology, whatever the spelling, in projects and experiences", () => {
    expect(ids("flutter")).toEqual(["shifts", "acme"]);
    expect(ids("kafka")).toEqual(["crm"]);
    expect(ids("apache kafka")).toEqual(["crm"]);
    expect(ids("nextjs")).toEqual(["goias"]);
    expect(ids("next.js")).toEqual(["goias"]);
    expect(ids("node")).toEqual(["acme"]);
    expect(ids("sql")).toEqual(["shifts"]);
  });

  it("reads a short word as a name, not as a piece of one", () => {
    // Not "Category": `go` inside a word is noise; the start of a title is not.
    expect(ids("go")).toEqual(["goias", "crm"]);
    expect(ids("at")).toEqual([]);
  });

  it("asks for every word, in any order", () => {
    expect(ids("flutter doctorx")).toEqual(["shifts"]);
    expect(ids("doctorx kafka")).toEqual([]);
  });

  it("puts a title before a technology, and a technology before a description", () => {
    const list = [
      item("text", "project", "A", { detail: "a flutter of wings" }),
      item("tech", "project", "B", { terms: ["Flutter"] }),
      item("name", "project", "Flutter kit"),
    ];
    expect(search(list, "flutter").map(({ id }) => id)).toEqual(["name", "tech", "text"]);
  });

  it("suggests where to go when nothing was typed, not the whole catalogue", () => {
    expect(ids("")).toEqual(["contact", "career", "projects", "dracula", "cv"]);
    expect(ids("   ")).toEqual(ids(""));
  });

  it("finds nothing in what nothing matches", () => {
    expect(ids("xyzzy")).toEqual([]);
    expect(ids("???")).toEqual([]);
  });
});
