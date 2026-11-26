import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ClosureReason, FunnelStage, InterviewStatus, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { acceptsClosureReason } from "@/lib/applications";

/**
 * What only a real Postgres can answer about the dossier fields: the CHECKs,
 * what the migration does to rows that already exist, the upsert under
 * concurrency and the rollback of a sync run.
 *
 * Runs when TEST_DATABASE_URL points at a server where a database can be
 * created; CI has none, so there it is skipped. It never touches the database
 * in the URL: it creates its own, migrates them and drops them at the end.
 *
 *   TEST_DATABASE_URL="postgresql://maarkn:maarkn@localhost:5433/maarkn_website" pnpm test
 */
const SERVER = process.env.TEST_DATABASE_URL;
const MIGRATION = "20261124160000_dossier_fields";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { email: "admin@example.com" } }) }));
const held = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/db", () => ({
  dbConfigured: true,
  db: new Proxy({}, { get: (_t, model) => (held.db as Record<string | symbol, unknown>)[model] }),
}));

describe.skipIf(!SERVER)("dossier fields on a real Postgres", () => {
  const suffix = `${process.pid}_${Date.now().toString(36)}`;
  const created: string[] = [];
  const tmp = SERVER ? mkdtempSync(join(tmpdir(), "dossier-db-")) : "";
  let admin: PrismaClient;

  const migrate = (url: string, schema = "prisma/schema.prisma") =>
    execFileSync("node_modules/.bin/prisma", ["migrate", "deploy", "--schema", schema], {
      env: { ...process.env, DATABASE_URL: url },
      encoding: "utf8",
      stdio: "pipe",
    });

  async function createDatabase(label: string): Promise<string> {
    const name = `dossier_test_${label}_${suffix}`;
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    created.push(name);
    const target = new URL(SERVER!);
    target.pathname = `/${name}`;
    return target.toString();
  }

  const connect = (url: string) => new PrismaClient({ datasources: { db: { url } }, log: [] });

  beforeAll(() => {
    admin = connect(SERVER!);
  });

  afterAll(async () => {
    for (const name of created) {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    }
    await admin?.$disconnect();
    rmSync(tmp, { recursive: true, force: true });
  }, 60_000);

  // -------------------------------------------------------------------------

  describe("the migration, on a database left by the previous version", () => {
    type Seen = { id: string; status: string; orderIndex: number; scheduledAt: Date | null; outcome: string | null };
    let db: PrismaClient;
    let before: { interviews: number; applications: number; companies: number };
    let after: Record<string, Seen>;

    beforeAll(async () => {
      const url = await createDatabase("upgrade");

      const old = join(tmp, "prisma");
      cpSync("prisma", old, { recursive: true });
      for (const name of readdirSync(join(old, "migrations"))) {
        if (/^\d/.test(name) && name >= MIGRATION) {
          rmSync(join(old, "migrations", name), { recursive: true });
        }
      }
      migrate(url, join(old, "schema.prisma"));

      db = connect(url);
      await db.$executeRawUnsafe(
        `INSERT INTO "Company" ("id","folderName","name","updatedAt") VALUES ('c','acme','Acme',now())`,
      );
      for (const [id, stage] of [["a", "rejected"], ["b", "ghosted"], ["c", "interview"]]) {
        await db.$executeRawUnsafe(
          `INSERT INTO "Application" ("id","folderName","companyId","stage","outcomeReason","updatedAt")
           VALUES ('${id}','${id}','c','${stage}','said no',now())`,
        );
      }
      const rows: [string, string, number | null, string, string | null][] = [
        // id, application, round, scheduledAt (SQL), outcome
        // In "a" the round and the date disagree, so only the round puts
        // "future" first; the one without a round comes after both.
        ["future", "a", 1, "now() + interval '9 days'", null],
        ["future-pending", "a", 2, "now() + interval '3 days'", "pending"],
        ["future-unnumbered", "a", null, "now() + interval '1 day'", null],
        ["past-passed", "b", null, "now() - interval '9 days'", "passed"],
        ["past-failed", "b", null, "now() - interval '3 days'", "Failed"],
        ["past-open", "b", null, "now() - interval '1 day'", null],
        ["past-pending", "b", null, "now() - interval '1 hour'", "pending"],
        ["past-blank", "b", null, "now() - interval '2 hours'", "  "],
        ["undated", "c", null, "NULL", null],
        ["undated-passed", "c", null, "NULL", "passed"],
        ["cancelled-dated", "c", null, "now() + interval '1 day'", "cancelled"],
        ["cancelled-undated", "c", null, "NULL", "Canceled"],
      ];
      for (const [index, [id, application, round, at, outcome]] of rows.entries()) {
        await db.$executeRawUnsafe(
          `INSERT INTO "Interview" ("id","applicationId","round","kind","scheduledAt","outcome","createdAt","updatedAt")
           VALUES ('${id}','${application}',${round},'technical',(${at}) AT TIME ZONE 'UTC',${outcome === null ? "NULL" : `'${outcome}'`},now() + interval '${index} seconds',now())`,
        );
      }
      before = await counts();
      migrate(url);
      const seen = await db.interview.findMany();
      after = Object.fromEntries(seen.map((row) => [row.id, row]));
    }, 120_000);

    afterAll(() => db?.$disconnect());

    async function counts() {
      const [row] = await db.$queryRawUnsafe<{ i: bigint; a: bigint; c: bigint }[]>(
        `SELECT (SELECT count(*) FROM "Interview") i, (SELECT count(*) FROM "Application") a, (SELECT count(*) FROM "Company") c`,
      );
      return { interviews: Number(row.i), applications: Number(row.a), companies: Number(row.c) };
    }

    it("loses and creates no row", async () => {
      expect(before).toEqual({ interviews: 12, applications: 3, companies: 1 });
      expect(await counts()).toEqual(before);
    });

    it("fills the situation of each interview", () => {
      expect(Object.fromEntries(Object.values(after).map((row) => [row.id, row.status]))).toEqual({
        future: "scheduled",
        "future-pending": "scheduled",
        "future-unnumbered": "scheduled",
        "past-passed": "completed",
        "past-failed": "completed",
        "past-open": "scheduled",
        "past-pending": "scheduled",
        "past-blank": "scheduled",
        undated: "planned",
        "undated-passed": "planned",
        "cancelled-dated": "cancelled",
        "cancelled-undated": "cancelled",
      });
    });

    it("keeps the date and the outcome of each interview", () => {
      expect(after["past-passed"].outcome).toBe("passed");
      expect(after["undated-passed"].outcome).toBe("passed");
      expect(after["cancelled-dated"].scheduledAt).not.toBeNull();
      expect(after["past-open"].scheduledAt).not.toBeNull();
    });

    it("orders by round, then date, then registration, inside each application", () => {
      const order = (ids: string[]) =>
        ids.sort((x, y) => after[x].orderIndex - after[y].orderIndex);
      expect(order(["future-unnumbered", "future-pending", "future"])).toEqual([
        "future", "future-pending", "future-unnumbered",
      ]);
      expect(order(["past-open", "past-passed", "past-pending", "past-blank", "past-failed"])).toEqual([
        "past-passed", "past-failed", "past-open", "past-blank", "past-pending",
      ]);
      expect(order(["cancelled-undated", "undated", "cancelled-dated", "undated-passed"])).toEqual([
        "cancelled-dated", "undated", "undated-passed", "cancelled-undated",
      ]);
      expect(after.future.orderIndex).toBe(0);
    });

    it("guesses no closure reason and keeps the free text", async () => {
      const rows = await db.application.findMany({ orderBy: { id: "asc" } });
      expect(rows.map((row) => [row.closureReason, row.outcomeReason, row.projectInfoMd])).toEqual(
        Array(3).fill([null, "said no", null]),
      );
    });
  });

  // -------------------------------------------------------------------------

  describe("on an empty database", () => {
    let db: PrismaClient;

    beforeAll(async () => {
      const url = await createDatabase("empty");
      migrate(url);
      db = connect(url);
      held.db = db;
    }, 120_000);

    afterAll(() => db?.$disconnect());

    beforeEach(async () => {
      await db.application.deleteMany();
      await db.provenance.deleteMany();
      await db.application.create({ data: { folderName: "acme" } });
    });

    const acme = () => db.application.findUniqueOrThrow({ where: { folderName: "acme" } });

    describe("a closure reason only exists in rejected and withdrawn", () => {
      it.each(Object.values(FunnelStage))("%s", async (stage) => {
        const write = db.application.update({
          where: { folderName: "acme" },
          data: { stage, closureReason: "visa" },
        });
        if (acceptsClosureReason(stage)) {
          await expect(write).resolves.toMatchObject({ stage, closureReason: "visa" });
        } else {
          await expect(write).rejects.toThrow(/Application_closureReason_stage/);
        }
      });

      it("the stage cannot leave and forget the reason behind", async () => {
        await db.application.update({
          where: { folderName: "acme" },
          data: { stage: "rejected", closureReason: "visa" },
        });
        await expect(
          db.application.update({ where: { folderName: "acme" }, data: { stage: "applied" } }),
        ).rejects.toThrow(/Application_closureReason_stage/);
      });

      it("can be added up", async () => {
        for (const [index, closureReason] of (["visa", "visa", "salary"] as ClosureReason[]).entries()) {
          await db.application.create({
            data: { folderName: `closed-${index}`, stage: "rejected", closureReason },
          });
        }
        const total = await db.application.groupBy({
          by: ["closureReason"],
          where: { closureReason: { not: null } },
          _count: { _all: true },
          orderBy: { closureReason: "asc" },
        });
        expect(total.map((row) => [row.closureReason, row._count._all])).toEqual([
          ["salary", 1],
          ["visa", 2],
        ]);
      });
    });

    describe("the backoffice reopens a rejected application", () => {
      const PATHS: [string, (id: string) => Promise<unknown>][] = [
        [
          "dossier",
          async (id) =>
            (await import("@/app/admin/applications/[id]/actions")).moveApplicationStage(id, "interview"),
        ],
        [
          "board",
          async (id) =>
            (await import("@/app/admin/applications/board/actions")).moveApplicationStage(id, "interview"),
        ],
        [
          "form",
          async (id) => {
            const data = new FormData();
            for (const [field, value] of Object.entries({
              company: "Acme",
              folderName: "acme",
              stage: "interview",
              source: "linkedin",
            })) {
              data.set(field, value);
            }
            const form = await import("@/app/_actions/applications");
            return form.updateApplication(id, { status: "idle" }, data);
          },
        ],
      ];

      it.each(PATHS)("%s: the reason goes away and the history says which", async (_name, move) => {
        const { id } = await db.application.update({
          where: { folderName: "acme" },
          data: { stage: "rejected", closureReason: "visa" },
        });
        await move(id);
        expect(await acme()).toMatchObject({ stage: "interview", closureReason: null });
        expect(await db.applicationEvent.findMany({ where: { applicationId: id } })).toMatchObject([
          {
            type: "stage_change",
            fromStage: "rejected",
            toStage: "interview",
            bodyMd: "Motivo de encerramento removido: Visto.",
          },
        ]);
      });
    });

    describe("an interview's situation agrees with its date", () => {
      const cases = Object.values(InterviewStatus).flatMap((status) =>
        [null, new Date()].map((scheduledAt) => ({
          status,
          scheduledAt,
          dated: Boolean(scheduledAt),
          fits: status === "cancelled" || (status === "planned") === !scheduledAt,
        })),
      );

      it.each(cases)("$status, dated $dated: fits $fits", async ({ status, scheduledAt, fits }) => {
        const write = db.interview.create({
          data: { applicationId: (await acme()).id, kind: "technical", status, scheduledAt },
        });
        if (fits) await expect(write).resolves.toMatchObject({ status, visibility: "private" });
        else await expect(write).rejects.toThrow(/Interview_status_date/);
      });
    });

    describe("the tools", () => {
      const CTX = {
        apiKeyId: "", // filled below: Provenance and SyncRun reference a real key
        apiKeyName: "test",
        keyPrefix: "mk_test_ab12cd34",
        scopes: ["applications:write", "sync:write"],
        keyExpiresAt: null,
        ip: "127.0.0.1",
        auditId: null as string | null,
        tool: "",
      };

      beforeAll(async () => {
        const key = await db.apiKey.create({
          data: {
            name: "test",
            keyHash: "a".repeat(64),
            keyPrefix: CTX.keyPrefix,
            scopes: CTX.scopes,
          },
        });
        CTX.apiKeyId = key.id;
      });

      async function run(name: string, args: Record<string, unknown>) {
        const { MCP_TOOLS_BY_NAME } = await import("@/lib/mcp/tools");
        const result = await MCP_TOOLS_BY_NAME.get(name)!.handler(args as never, {
          ...CTX,
          tool: name,
        } as never);
        return result.structuredContent as Record<string, unknown>;
      }

      it("the same call many times at once leaves one interview", async () => {
        const args = { folderName: "acme", sourceKey: "acme#1", kind: "technical" };
        await Promise.all(Array.from({ length: 8 }, () => run("upsert_interview", args)));
        expect(await db.interview.count()).toBe(1);
        await run("upsert_interview", { ...args, notesMd: "last" });
        expect(await db.interview.findMany()).toMatchObject([
          { sourceKey: "acme#1", notesMd: "last", visibility: "private", status: "planned" },
        ]);
      });

      it("reopened again on the same day: the first event keeps the reason it removed", async () => {
        const { id } = await acme();
        const reopen = () => run("update_application_stage", { folderName: "acme", stage: "interview" });
        await run("upsert_application", { folderName: "acme", stage: "rejected", closureReason: "visa" });
        const first = await reopen();
        await run("upsert_application", { folderName: "acme", stage: "rejected" });
        const second = await reopen();

        expect(
          await db.applicationEvent.findMany({
            where: { applicationId: id, fromStage: "rejected" },
            orderBy: { createdAt: "asc" },
            select: { id: true, bodyMd: true },
          }),
        ).toEqual([
          { id: first.eventoId, bodyMd: "Motivo de encerramento removido: Visto." },
          { id: second.eventoId, bodyMd: null },
        ]);
      });

      it("the same reopening many times at once is one event, with the reason", async () => {
        const { id } = await db.application.update({
          where: { folderName: "acme" },
          data: { stage: "rejected", closureReason: "visa" },
        });
        await Promise.allSettled(
          Array.from({ length: 8 }, () =>
            run("update_application_stage", { folderName: "acme", stage: "interview" }),
          ),
        );
        expect(await acme()).toMatchObject({ stage: "interview", closureReason: null });
        expect(await db.applicationEvent.findMany({ where: { applicationId: id } })).toMatchObject([
          { fromStage: "rejected", bodyMd: "Motivo de encerramento removido: Visto." },
        ]);
      });

      it("the same key at once in different applications: each one keeps its event", async () => {
        const folders = Array.from({ length: 6 }, (_, index) => `shared-${index}`);
        await db.application.createMany({
          data: folders.map((folderName) => ({ folderName, stage: "rejected", closureReason: "visa" })),
        });
        await Promise.all(
          folders.map((folderName) =>
            run("update_application_stage", { folderName, stage: "interview", sourceKey: "shared" }),
          ),
        );
        const events = await db.applicationEvent.findMany({ include: { application: true } });
        expect(events.map((event) => event.application.folderName).sort()).toEqual(folders);
        expect(events.map((event) => event.sourceKey).sort()).toEqual([
          "shared",
          ...[2, 3, 4, 5, 6].map((nth) => `shared#${nth}`),
        ]);
      });

      it("reverting a run undoes what it did to interviews and reasons", async () => {
        const AT = "2026-12-01T17:30:00.000Z";
        await run("upsert_interview", { folderName: "acme", sourceKey: "kept", kind: "technical", notesMd: "n" });
        await run("upsert_application", { folderName: "acme", stage: "rejected", closureReason: "visa" });

        const { syncRunId } = await run("open_sync_run", { resume: false });
        await run("upsert_interview", { folderName: "acme", sourceKey: "kept", scheduledAt: AT, interviewers: ["Ana"], syncRunId });
        await run("upsert_interview", { folderName: "acme", sourceKey: "kept", status: "completed", syncRunId });
        await run("upsert_interview", { folderName: "acme", sourceKey: "new", kind: "final", syncRunId });
        await run("update_application_stage", { folderName: "acme", stage: "interview", syncRunId });
        expect(await acme()).toMatchObject({ stage: "interview", closureReason: null });

        await run("close_sync_run", { syncRunId, status: "ok" });
        const reverted = await run("revert_sync_run", { syncRunId, confirm: "reverter", dryRun: false });

        expect(reverted.falhas).toEqual([]);
        expect(await db.interview.findMany()).toMatchObject([
          { sourceKey: "kept", status: "planned", scheduledAt: null, interviewers: [], notesMd: "n" },
        ]);
        expect(await acme()).toMatchObject({ stage: "rejected", closureReason: "visa" });
      });

      describe("reverting a run over what changed after it", () => {
        const revert = async (syncRunId: unknown) => {
          await run("close_sync_run", { syncRunId, status: "ok" });
          return run("revert_sync_run", { syncRunId, confirm: "reverter", dryRun: false });
        };

        it("a reason given after the run: the application reopens, and the history says which went", async () => {
          const { id } = await acme();
          await run("update_application_stage", { folderName: "acme", stage: "interview" });
          const { syncRunId } = await run("open_sync_run", { resume: false });
          await run("update_application_stage", { folderName: "acme", stage: "rejected", syncRunId });
          await run("upsert_application", { folderName: "acme", closureReason: "visa" });

          const reverted = await revert(syncRunId);

          expect(reverted.falhas).toEqual([]);
          expect(await acme()).toMatchObject({ stage: "interview", closureReason: null });
          expect(
            await db.applicationEvent.findMany({
              where: { applicationId: id, fromStage: "rejected" },
              select: { toStage: true, bodyMd: true },
            }),
          ).toEqual([
            { toStage: "interview", bodyMd: expect.stringContaining("Motivo de encerramento removido: Visto.") },
          ]);
        });

        it("a date removed after the run: the date and the notes come back, and it is scheduled again", async () => {
          const [D1, D2] = ["2026-12-01T17:30:00.000Z", "2026-12-08T17:30:00.000Z"];
          const interview = { folderName: "acme", sourceKey: "kept" };
          await run("upsert_interview", { ...interview, kind: "technical", scheduledAt: D1, notesMd: "before" });
          const { syncRunId } = await run("open_sync_run", { resume: false });
          await run("upsert_interview", { ...interview, scheduledAt: D2, notesMd: "from run", syncRunId });
          await run("upsert_interview", { ...interview, scheduledAt: null });

          const reverted = await revert(syncRunId);

          expect(reverted.falhas).toEqual([]);
          expect(await db.interview.findMany()).toMatchObject([
            { status: "scheduled", scheduledAt: new Date(D1), notesMd: "before" },
          ]);
        });

        it("what the rules do not let come back is a failure that says why, and the rest comes back", async () => {
          const interview = { folderName: "acme", sourceKey: "kept" };
          await run("upsert_interview", {
            ...interview,
            kind: "technical",
            scheduledAt: "2026-12-01T17:30:00.000Z",
            notesMd: "before",
          });
          const { syncRunId } = await run("open_sync_run", { resume: false });
          await run("upsert_interview", { ...interview, status: "completed", notesMd: "from run", syncRunId });
          await run("upsert_interview", { ...interview, status: "cancelled", scheduledAt: null });

          const reverted = await revert(syncRunId);

          expect(reverted.falhas).toEqual([
            { entityType: "Interview", entityId: expect.any(String), erro: expect.stringMatching(/^Restaurado em parte: .*Falta a data/) },
          ]);
          expect(await db.interview.findMany()).toMatchObject([
            { status: "cancelled", scheduledAt: null, notesMd: "before" },
          ]);
        });
      });

      it("the company's text reaches both of its applications", async () => {
        const company = { folderName: "acme" };
        await run("upsert_application", { folderName: "acme", company, projectInfoMd: "one" });
        await run("upsert_application", { folderName: "other", company, projectInfoMd: "two" });
        await run("upsert_application", { folderName: "acme", company: { ...company, aboutMd: "About" } });

        const dossiers = await Promise.all(
          ["acme", "other"].map((folderName) =>
            run("get_application", { folderName, includeDocumentContent: false, includeEvents: true, maxEvents: 50 }),
          ),
        );
        expect(dossiers.map((row) => (row.empresa as { aboutMd: string }).aboutMd)).toEqual([
          expect.stringContaining("About"),
          expect.stringContaining("About"),
        ]);
        expect(dossiers.map((row) => row.projectInfoMd)).toEqual([
          expect.stringContaining("one"),
          expect.stringContaining("two"),
        ]);
        expect(await db.company.findMany()).toMatchObject([{ visibility: "private" }]);
      });
    });
  });
});
