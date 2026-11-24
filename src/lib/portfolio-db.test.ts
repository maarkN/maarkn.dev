import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { projects } from "@/lib/projects";

/**
 * What only a real Postgres can answer: the limits the database itself enforces
 * on success cases, and what the two scripts do to rows that already exist.
 *
 * Runs when TEST_DATABASE_URL points at a server where a database can be
 * created; CI has none, so there it is skipped. It never touches the database
 * in the URL: it creates one of its own, migrates it and drops it at the end.
 *
 *   TEST_DATABASE_URL="postgresql://maarkn:maarkn@localhost:5433/maarkn_website" pnpm test
 */
const SERVER = process.env.TEST_DATABASE_URL;

const CASE = {
  caseProblemEn: "problem",
  caseProblemPt: "problema",
  caseWorkEn: "work",
  caseWorkPt: "trabalho",
  caseResultEn: "result",
  caseResultPt: "resultado",
};

function bareProject(slug: string) {
  return {
    slug,
    name: slug,
    year: "2026",
    category: "web",
    monogram: "XX",
    accentFrom: "#000000",
    accentTo: "#ffffff",
  };
}

describe.skipIf(!SERVER)("portfolio on a real Postgres", () => {
  const name = `portfolio_test_${process.pid}_${Date.now().toString(36)}`;
  let url = "";
  let admin: PrismaClient;
  let db: PrismaClient;

  const run = (bin: string, args: string[]) =>
    execFileSync(`node_modules/.bin/${bin}`, args, {
      env: { ...process.env, DATABASE_URL: url },
      encoding: "utf8",
      stdio: "pipe",
    });
  const syncProjects = () => run("tsx", ["scripts/sync-projects.ts"]);
  const fillText = () => run("tsx", ["scripts/fill-project-text.ts"]);

  beforeAll(async () => {
    const target = new URL(SERVER!);
    admin = new PrismaClient({ datasources: { db: { url: SERVER } } });
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    target.pathname = `/${name}`;
    url = target.toString();
    run("prisma", ["migrate", "deploy"]);
    db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  }, 120_000);

  afterAll(async () => {
    await db?.$disconnect();
    await admin?.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin?.$disconnect();
  }, 60_000);

  beforeEach(async () => {
    await db.project.deleteMany();
  });

  describe("at most three success cases", () => {
    const mark = (slug: string, casePosition: number, text: Partial<typeof CASE> = CASE) =>
      db.project.create({ data: { ...bareProject(slug), ...text, casePosition } });

    beforeEach(async () => {
      for (const position of [1, 2, 3]) await mark(`case-${position}`, position);
    });

    it.each([1, 2, 3])("refuses a fourth one in position %i, which is taken", async (position) => {
      await expect(mark("fourth", position)).rejects.toMatchObject({ code: "P2002" });
      expect(await db.project.count({ where: { casePosition: { not: null } } })).toBe(3);
    });

    it.each([0, 4, -1])("refuses a fourth one in position %i, which does not exist", async (position) => {
      await expect(mark("fourth", position)).rejects.toThrow(/Project_casePosition_range/);
      expect(await db.project.count({ where: { casePosition: { not: null } } })).toBe(3);
    });

    it("refuses marking an existing fourth project too", async () => {
      const fourth = await db.project.create({ data: { ...bareProject("fourth"), ...CASE } });
      for (const casePosition of [1, 2, 3, 4]) {
        await expect(
          db.project.update({ where: { id: fourth.id }, data: { casePosition } }),
        ).rejects.toThrow();
      }
    });

    it("accepts another once one is unmarked", async () => {
      await db.project.update({ where: { slug: "case-2" }, data: { casePosition: null } });
      await expect(mark("fourth", 2)).resolves.toMatchObject({ casePosition: 2 });
    });

    it.each(Object.keys(CASE))("refuses a case without %s", async (column) => {
      await db.project.update({ where: { slug: "case-3" }, data: { casePosition: null } });
      for (const empty of [null, "", " \n\t"]) {
        await expect(mark("empty", 3, { ...CASE, [column]: empty })).rejects.toThrow(
          /Project_casePosition_needs_text/,
        );
      }
      await expect(
        db.project.update({ where: { slug: "case-1" }, data: { [column]: null } }),
      ).rejects.toThrow(/Project_casePosition_needs_text/);
    });
  });

  describe("the gallery", () => {
    it("keeps one image per position and goes away with the project", async () => {
      const project = await db.project.create({
        data: {
          ...bareProject("with-gallery"),
          images: {
            create: [
              { position: 2, path: "/uploads/b.webp", captionPt: "segunda" },
              { position: 1, path: "/uploads/a.webp", captionEn: "first" },
            ],
          },
        },
        include: { images: { orderBy: { position: "asc" } } },
      });
      expect(project.images.map((i) => i.path)).toEqual(["/uploads/a.webp", "/uploads/b.webp"]);
      await expect(
        db.projectImage.create({ data: { projectId: project.id, position: 1, path: "/uploads/c.webp" } }),
      ).rejects.toMatchObject({ code: "P2002" });

      await db.project.delete({ where: { id: project.id } });
      expect(await db.projectImage.count()).toBe(0);
    });
  });

  describe("db:sync-projects", () => {
    it("creates what is missing, with the text of both languages and the three cases", async () => {
      syncProjects();
      const rows = await db.project.findMany();
      expect(rows.map((r) => r.slug).sort()).toEqual(projects.map((p) => p.slug).sort());
      for (const row of rows) {
        expect(row.tagline).toBe((en.projects.taglines as Record<string, string>)[row.slug]);
        expect(row.taglinePt).toBe((ptBR.projects.taglines as Record<string, string>)[row.slug]);
      }
      const cases = rows.filter((r) => r.casePosition !== null);
      expect(
        cases.sort((a, b) => a.casePosition! - b.casePosition!).map((r) => r.name),
      ).toEqual(["Dermagenix", "DoctorX", "SenseVox"]);
    }, 60_000);

    it("keeps an edited text and still updates what is not text", async () => {
      syncProjects();
      const edited = {
        name: "Edited name",
        tagline: "edited tagline",
        taglinePt: "resumo editado",
        description: "edited description",
        descriptionPt: "descrição editada",
        role: "edited role",
        rolePt: "função editada",
        featuresJson: '["edited feature"]',
        featuresPtJson: '["entrega editada"]',
        caseProblemPt: "problema editado",
      };
      await db.project.update({
        where: { slug: "voip-platform" },
        data: { ...edited, year: "1999", status: "live", stackJson: "[]", coverImage: "/uploads/x.webp" },
      });
      await db.project.update({ where: { slug: "locasty" }, data: { taglinePt: null } });
      await db.project.updateMany({ data: { casePosition: null } });
      await db.project.create({ data: { ...bareProject("created-in-admin"), tagline: "mine" } });
      await db.project.delete({ where: { slug: "maarkn-dev" } });

      syncProjects();

      const seed = projects.find((p) => p.slug === "voip-platform")!;
      expect(await db.project.findUnique({ where: { slug: "voip-platform" } })).toMatchObject({
        ...edited,
        year: seed.year,
        status: seed.status,
        stackJson: JSON.stringify(seed.stack),
        coverImage: "/uploads/x.webp",
      });
      // Not even text that is missing: filling it is the other script's job.
      expect((await db.project.findUnique({ where: { slug: "locasty" } }))!.taglinePt).toBeNull();
      // The choice of cases is Marco's, and "none" is a choice.
      expect(await db.project.count({ where: { casePosition: { not: null } } })).toBe(0);
      expect(await db.project.findUnique({ where: { slug: "created-in-admin" } })).toMatchObject({
        tagline: "mine",
      });
      expect(await db.project.findUnique({ where: { slug: "maarkn-dev" } })).toMatchObject({
        taglinePt: ptBR.projects.taglines["maarkn-dev"],
      });
    }, 60_000);
  });

  describe("db:fill-project-text", () => {
    /** The table as the previous version left it: English only, no case. */
    async function previousVersion() {
      syncProjects();
      await db.project.updateMany({
        data: {
          casePosition: null,
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
        },
      });
    }
    const snapshot = () => db.project.findMany({ orderBy: { slug: "asc" } });

    it("fills what is empty and changes nothing the second time", async () => {
      await previousVersion();
      fillText();
      const first = await snapshot();
      for (const row of first) {
        expect(row.taglinePt).toBe((ptBR.projects.taglines as Record<string, string>)[row.slug]);
        expect(row.rolePt).toBeTruthy();
      }
      expect(first.filter((r) => r.casePosition !== null)).toHaveLength(3);

      const output = fillText();
      expect(output).toContain("0 of 19 project(s) filled");
      // Whole rows, `updatedAt` included.
      expect(await snapshot()).toEqual(first);
    }, 60_000);

    it("keeps edits, reports them, and respects the cases already chosen", async () => {
      await previousVersion();
      await db.project.update({ where: { slug: "locasty" }, data: { tagline: "edited", taglinePt: "editado" } });
      await db.project.create({ data: { ...bareProject("chosen"), ...CASE, casePosition: 1 } });

      const output = fillText();

      expect(output).toContain("locasty: kept, differs from the seed: tagline");
      expect(await db.project.findUnique({ where: { slug: "locasty" } })).toMatchObject({
        tagline: "edited",
        taglinePt: "editado",
        rolePt: ptBR.projects.details.locasty.role,
      });
      const cases = await db.project.findMany({ where: { casePosition: { not: null } } });
      expect(cases.map((r) => r.slug)).toEqual(["chosen"]);
      expect((await db.project.findUnique({ where: { slug: "voip-platform" } }))!.caseProblemPt).toBe(
        ptBR.projects.cases["voip-platform"].problem,
      );
    }, 60_000);
  });
});
