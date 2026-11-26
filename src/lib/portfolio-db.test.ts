import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { FILL_PROJECT_TEXT } from "@/lib/project-fill";
import { projects } from "@/lib/projects";

/**
 * What only a real Postgres can answer: the limits the database itself enforces
 * on success cases, and what the scripts do to rows that already exist.
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

  const run = (bin: string, args: string[], on = url) =>
    execFileSync(`node_modules/.bin/${bin}`, args, {
      env: { ...process.env, DATABASE_URL: on },
      encoding: "utf8",
      stdio: "pipe",
    });
  const syncProjects = () => run("tsx", ["scripts/sync-projects.ts"]);
  const fillText = () => run("tsx", ["scripts/fill-project-text.ts"]);

  async function createDatabase(database: string): Promise<string> {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
    const target = new URL(SERVER!);
    target.pathname = `/${database}`;
    return target.toString();
  }
  const dropDatabase = (database: string) =>
    admin?.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);

  beforeAll(async () => {
    admin = new PrismaClient({ datasources: { db: { url: SERVER } } });
    url = await createDatabase(name);
    run("prisma", ["migrate", "deploy"]);
    db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  }, 120_000);

  afterAll(async () => {
    await db?.$disconnect();
    await dropDatabase(name);
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
    /**
     * The database as the previous version left it: English only, no case, and
     * the script has never run on it.
     */
    async function previousVersion() {
      syncProjects();
      await db.dataMigration.deleteMany();
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

      expect(fillText()).toContain("already ran");
      // Whole rows, `updatedAt` included.
      expect(await snapshot()).toEqual(first);
    }, 60_000);

    // The service runs on every deploy, and none of them may undo an edit.
    // Clearing a field and unmarking a case are edits.
    it("leaves a field cleared in the backoffice empty", async () => {
      await previousVersion();
      fillText();
      await db.project.update({
        where: { slug: "jobradar-ai" },
        data: { tagline: "edited", taglinePt: null, rolePt: "", featuresJson: "[]" },
      });
      const edited = await snapshot();

      fillText();

      expect(await snapshot()).toEqual(edited);
    }, 60_000);

    it("leaves an unmarked case unmarked, with or without its text", async () => {
      await previousVersion();
      fillText();
      await db.project.updateMany({ data: { casePosition: null } });
      await db.project.update({
        where: { slug: "dermatology-ai-platform" },
        data: {
          caseProblemEn: null,
          caseProblemPt: null,
          caseWorkEn: null,
          caseWorkPt: null,
          caseResultEn: null,
          caseResultPt: null,
        },
      });
      const edited = await snapshot();

      fillText();

      expect(await snapshot()).toEqual(edited);
    }, 60_000);

    it("runs again when the first run failed halfway", async () => {
      await previousVersion();
      await db.$executeRawUnsafe(
        `ALTER TABLE "Project" ADD CONSTRAINT "boom" CHECK ("rolePt" IS NULL) NOT VALID`,
      );
      const before = await snapshot();
      try {
        expect(() => fillText()).toThrow(/boom/);
      } finally {
        await db.$executeRawUnsafe(`ALTER TABLE "Project" DROP CONSTRAINT "boom"`);
      }
      expect(await snapshot()).toEqual(before);

      expect(fillText()).toContain("19 of 19 project(s) filled");
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

  describe("the migration, on a database of the previous version", () => {
    const FIRST = "20261124140000_portfolio_content";
    const old = `${name}_old`;
    let oldUrl = "";
    let oldDb: PrismaClient;
    let dir = "";

    /** The columns the previous schema has; the generated client knows more. */
    const rows = () =>
      oldDb.$queryRaw<Record<string, unknown>[]>`
        SELECT to_jsonb(p) - 'updatedAt' AS row FROM "Project" p ORDER BY slug
      `.then((all) => all.map((r) => r.row as Record<string, unknown>));
    const alignEnglish = (...args: string[]) =>
      // Over stdin, as DEPLOY.md runs it: the image that is live has no such file.
      execFileSync("node", ["--input-type=module", "-", ...args], {
        input: readFileSync("scripts/align-english-text.mjs"),
        env: { ...process.env, DATABASE_URL: oldUrl },
        encoding: "utf8",
        stdio: "pipe",
      });

    beforeEach(async () => {
      oldUrl = await createDatabase(old);
      dir = mkdtempSync(join(tmpdir(), "portfolio-previous-"));
      cpSync("prisma/schema.prisma", join(dir, "schema.prisma"));
      cpSync("prisma/migrations", join(dir, "migrations"), { recursive: true });
      for (const migration of readdirSync(join(dir, "migrations"))) {
        if (/^\d/.test(migration) && migration >= FIRST) {
          rmSync(join(dir, "migrations", migration), { recursive: true });
        }
      }
      run("prisma", ["migrate", "deploy", "--schema", join(dir, "schema.prisma")], oldUrl);
      oldDb = new PrismaClient({ datasources: { db: { url: oldUrl } }, log: [] });
      for (const p of projects) {
        await oldDb.$executeRaw`
          INSERT INTO "Project" (id, slug, name, year, category, monogram, "accentFrom", "accentTo", tagline, "updatedAt")
          VALUES (${p.slug}, ${p.slug}, ${p.name}, ${p.year}, ${p.category}, ${p.monogram}, ${p.accent.from}, ${p.accent.to}, 'old wording', now())
        `;
      }
    }, 60_000);

    afterEach(async () => {
      await oldDb.$disconnect();
      await dropDatabase(old);
      rmSync(dir, { recursive: true, force: true });
    }, 60_000);

    it("leaves the rows to the script, which then fills them once", async () => {
      run("prisma", ["migrate", "deploy"], oldUrl);
      expect(await oldDb.dataMigration.count()).toBe(0);
      expect(run("tsx", ["scripts/fill-project-text.ts"], oldUrl)).toContain("19 of 19");
      expect(run("tsx", ["scripts/fill-project-text.ts"], oldUrl)).toContain("already ran");
    }, 60_000);

    it("has nothing to leave to it when there are no projects yet", async () => {
      await oldDb.$executeRaw`DELETE FROM "Project"`;
      run("prisma", ["migrate", "deploy"], oldUrl);
      expect(await oldDb.dataMigration.findMany({ select: { name: true } })).toEqual([
        { name: FILL_PROJECT_TEXT },
      ]);
      // So a project seeded and then edited, before any run, is safe too.
      run("tsx", ["scripts/sync-projects.ts"], oldUrl);
      await oldDb.project.update({ where: { slug: "locasty" }, data: { taglinePt: null } });
      run("tsx", ["scripts/fill-project-text.ts"], oldUrl);
      expect((await oldDb.project.findUnique({ where: { slug: "locasty" } }))!.taglinePt).toBeNull();
    }, 60_000);

    it("can be preceded by align-english-text, which touches nothing the site shows", async () => {
      await oldDb.$executeRaw`
        UPDATE "Project" SET name = 'Renamed', featured = true, year = '1999', "demoUrl" = 'https://edited.example',
          "stackJson" = '["X"]', "coverImage" = '/uploads/x.webp' WHERE slug = 'locasty'
      `;
      await oldDb.$executeRaw`
        INSERT INTO "Project" (id, slug, name, year, category, monogram, "accentFrom", "accentTo", tagline, "updatedAt")
        VALUES ('a', 'created-in-admin', 'A', '2026', 'web', 'A', '#000', '#fff', 'mine', now()),
               ('r', 'vanilla-farming-assistant', 'R', '2026', 'web', 'R', '#000', '#fff', 'retired', now())
      `;
      const before = await rows();

      expect(alignEnglish()).toContain("locasty: tagline, description, role, featuresJson");
      expect(await rows()).toEqual(before);

      expect(alignEnglish("--write")).toContain(" 19 project(s) now say");
      const details = en.projects.details as Record<string, { description: string; role: string; features: string[] }>;
      const taglines = en.projects.taglines as Record<string, string>;
      expect(await rows()).toEqual(
        before.map((row) => {
          const slug = row.slug as string;
          if (!details[slug]) return row;
          return {
            ...row,
            tagline: taglines[slug],
            description: details[slug].description,
            role: details[slug].role,
            featuresJson: JSON.stringify(details[slug].features),
          };
        }),
      );
      expect(alignEnglish()).toContain(" 0 project(s) differ");

      // After it, the deploy has nothing to report.
      run("prisma", ["migrate", "deploy"], oldUrl);
      expect(run("tsx", ["scripts/fill-project-text.ts"], oldUrl)).not.toContain("kept, differs");
    }, 60_000);

    it("shuts align-english-text out once the database is the source of the text", async () => {
      run("prisma", ["migrate", "deploy"], oldUrl);
      const before = await rows();
      for (const args of [[], ["--write"]]) {
        expect(() => alignEnglish(...args)).toThrow(/already the source/);
      }
      expect(await rows()).toEqual(before);
    }, 60_000);
  });
});
