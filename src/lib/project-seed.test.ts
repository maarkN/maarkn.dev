import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { decodeStringList } from "@/lib/json-list";
import { divergentText, metadataColumns, missingText, newRow } from "@/lib/project-seed";
import { langAttr, seedCaseText, seedText } from "@/lib/project-text";
import { projects, successCaseSlugs, type Project } from "@/lib/projects";

const slugs = projects.map((p) => p.slug);
const dictionaries = { en: en.projects, "pt-BR": ptBR.projects };
const voip = projects.find((p) => p.slug === "voip-platform")!;
const locasty = projects.find((p) => p.slug === "locasty")!;

/** A row as the old `db:sync-projects` left it: English only. */
const englishOnly = (p: Project) => ({
  ...newRow(p, { withCase: false }),
  taglinePt: null,
  descriptionPt: null,
  rolePt: null,
  featuresPtJson: "[]",
  caseProblemEn: null,
  caseProblemPt: null,
  caseWorkEn: null,
  caseWorkPt: null,
  caseResultEn: null,
  caseResultPt: null,
  casePosition: null,
});

describe("the seed is complete", () => {
  it("has 19 projects, each slug once", () => {
    expect(slugs).toHaveLength(19);
    expect(new Set(slugs).size).toBe(19);
  });

  it.each(["en", "pt-BR"] as const)("%s has text for exactly the slugs of lib/projects.ts", (lang) => {
    const { taglines, details } = dictionaries[lang];
    expect(Object.keys(taglines).sort()).toEqual([...slugs].sort());
    expect(Object.keys(details).sort()).toEqual([...slugs].sort());
  });

  it.each(slugs)("%s has every field written in both languages", (slug) => {
    for (const text of Object.values(seedText(slug))) {
      expect(text.tagline?.trim()).toBeTruthy();
      expect(text.description?.trim()).toBeTruthy();
      expect(text.role?.trim()).toBeTruthy();
      expect(text.features.length).toBeGreaterThan(0);
      for (const feature of text.features) expect(feature.trim()).toBeTruthy();
    }
  });

  it.each(["en", "pt-BR"] as const)("%s tells exactly the three success cases", (lang) => {
    expect(Object.keys(dictionaries[lang].cases).sort()).toEqual([...successCaseSlugs].sort());
    expect(successCaseSlugs.map((slug) => projects.find((p) => p.slug === slug)?.name)).toEqual([
      "Dermagenix",
      "DoctorX",
      "SenseVox",
    ]);
  });

  it("says DoctorX is in closed beta, in both languages", () => {
    const doctorx = seedCaseText("medical-shift-marketplace");
    expect(doctorx["pt-BR"].result).toMatch(/beta fechado/i);
    expect(doctorx.en.result).toMatch(/closed beta/i);
  });
});

describe("a row created from the seed", () => {
  it("carries the text of both languages", () => {
    const row = newRow(voip, { withCase: true });
    expect(row).toMatchObject({
      slug: "voip-platform",
      name: "SenseVox",
      tagline: en.projects.taglines["voip-platform"],
      taglinePt: ptBR.projects.taglines["voip-platform"],
      description: en.projects.details["voip-platform"].description,
      descriptionPt: ptBR.projects.details["voip-platform"].description,
      role: en.projects.details["voip-platform"].role,
      rolePt: ptBR.projects.details["voip-platform"].role,
      caseProblemPt: ptBR.projects.cases["voip-platform"].problem,
      caseResultEn: en.projects.cases["voip-platform"].result,
      casePosition: 3,
    });
    expect(decodeStringList(row.featuresPtJson)).toEqual(
      ptBR.projects.details["voip-platform"].features,
    );
  });

  it("has a case position only when asked, and only when it is a case", () => {
    expect(newRow(voip, { withCase: false }).casePosition).toBeNull();
    expect(newRow(locasty, { withCase: true }).casePosition).toBeNull();
  });
});

describe("updating an existing row (db:sync-projects)", () => {
  it("writes no text, no case and no image", () => {
    expect(Object.keys(metadataColumns(voip)).sort()).toEqual(
      [
        "accentFrom",
        "accentTo",
        "caseUrl",
        "category",
        "demoUrl",
        "featured",
        "monogram",
        "repoUrl",
        "sourceVisibility",
        "stackJson",
        "status",
        "year",
      ].sort(),
    );
  });

  it("never gives a private project a repo link", () => {
    const leaky: Project = { ...voip, links: { repo: "https://github.com/maarkN/private" } };
    expect(metadataColumns(leaky).repoUrl).toBeNull();
  });
});

describe("filling in missing text (db:fill-project-text)", () => {
  it("fills the Portuguese of a row that only has English", () => {
    expect(missingText(locasty.slug, englishOnly(locasty), { withCase: true })).toEqual({
      taglinePt: ptBR.projects.taglines.locasty,
      descriptionPt: ptBR.projects.details.locasty.description,
      rolePt: ptBR.projects.details.locasty.role,
      featuresPtJson: JSON.stringify(ptBR.projects.details.locasty.features),
    });
  });

  it.each(projects)("changes nothing on the second run ($slug)", (p) => {
    const row = englishOnly(p);
    const filled = { ...row, ...missingText(p.slug, row, { withCase: true }) };
    expect(missingText(p.slug, filled, { withCase: true })).toEqual({});
    expect(missingText(p.slug, newRow(p, { withCase: true }), { withCase: true })).toEqual({});
  });

  it("never overwrites an edit, in either language", () => {
    const edited = { ...englishOnly(locasty), tagline: "edited", rolePt: "editada" };
    const data = missingText(locasty.slug, edited, { withCase: true });
    expect(data).not.toHaveProperty("tagline");
    expect(data).not.toHaveProperty("rolePt");
    expect(data.taglinePt).toBe(ptBR.projects.taglines.locasty);
  });

  it("treats blanks as missing", () => {
    const blank = { ...englishOnly(locasty), tagline: "  ", featuresJson: " [] " };
    expect(missingText(locasty.slug, blank, { withCase: false })).toMatchObject({
      tagline: en.projects.taglines.locasty,
      featuresJson: JSON.stringify(en.projects.details.locasty.features),
    });
  });

  it("leaves a project that is not in the seed alone", () => {
    expect(missingText("created-in-admin", englishOnly(locasty), { withCase: true })).toEqual({});
  });

  it("seeds the case whole, with its position while nobody chose any", () => {
    expect(missingText(voip.slug, englishOnly(voip), { withCase: true })).toMatchObject({
      caseProblemEn: en.projects.cases["voip-platform"].problem,
      caseResultPt: ptBR.projects.cases["voip-platform"].result,
      casePosition: 3,
    });
    expect(missingText(voip.slug, englishOnly(voip), { withCase: false })).not.toHaveProperty(
      "casePosition",
    );
  });

  it("does not complete a case written by hand, nor mark it again once unmarked", () => {
    const byHand = { ...newRow(voip, { withCase: false }), caseWorkEn: "by hand", caseWorkPt: null };
    expect(missingText(voip.slug, byHand, { withCase: true })).toEqual({});
    const unmarked = newRow(voip, { withCase: false });
    expect(missingText(voip.slug, unmarked, { withCase: true })).toEqual({});
  });

  it("reports text that is not the seed's, and only that", () => {
    const row = newRow(voip, { withCase: true });
    expect(divergentText(voip.slug, row)).toEqual([]);
    expect(divergentText(voip.slug, englishOnly(voip))).toEqual([]);
    expect(divergentText(voip.slug, { ...row, tagline: "stale", featuresJson: '["stale"]' })).toEqual([
      "tagline",
      "featuresJson",
    ]);
  });
});

describe("langAttr", () => {
  it("marks text in another language and nothing else", () => {
    expect(langAttr({ value: "oi", lang: "pt-BR" }, "en")).toBe("pt-BR");
    expect(langAttr({ value: "hi", lang: "en" }, "en")).toBeUndefined();
    expect(langAttr(null, "en")).toBeUndefined();
  });
});
