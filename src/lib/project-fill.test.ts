import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import ptBR from "@/dictionaries/pt-BR.json";
import { FILL_PROJECT_TEXT, fillProjectText } from "@/lib/project-fill";
import { newRow } from "@/lib/project-seed";
import { projects } from "@/lib/projects";

/**
 * The `migrate` service calls `fillProjectText` on every deploy. A real Postgres
 * answers for the transaction in `portfolio-db.test.ts`; this is the part CI,
 * which has none, can hold: after the first run, nothing is written.
 */
type Row = ReturnType<typeof newRow> & { id: string };

/** The four calls the function makes, over plain arrays. */
function fakeDatabase() {
  const ran = new Set<string>();
  const rows: Row[] = projects.map((p) => ({
    ...newRow(p, { withCase: false }),
    id: p.slug,
    taglinePt: null,
    caseProblemEn: null,
    caseProblemPt: null,
    caseWorkEn: null,
    caseWorkPt: null,
    caseResultEn: null,
    caseResultPt: null,
  }));
  const tx = {
    dataMigration: {
      createMany: async ({ data }: { data: { name: string }[] }) => {
        const added = data.filter(({ name }) => !ran.has(name));
        for (const { name } of added) ran.add(name);
        return { count: added.length };
      },
    },
    project: {
      findMany: async () => rows.map((row) => ({ ...row })),
      count: async () => rows.filter((row) => row.casePosition !== null).length,
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) =>
        Object.assign(rows.find((row) => row.id === where.id)!, data),
    },
  };
  const deploy = async () => {
    const lines: string[] = [];
    await fillProjectText(tx as unknown as Prisma.TransactionClient, (line) => lines.push(line));
    return lines.join("\n");
  };
  return { ran, rows, deploy, row: (slug: string) => rows.find((r) => r.slug === slug)! };
}

describe("filling the text on deploy", () => {
  it("fills on the first one and leaves its name behind", async () => {
    const { ran, row, deploy } = fakeDatabase();
    expect(await deploy()).toContain("19 of 19 project(s) filled");
    expect([...ran]).toEqual([FILL_PROJECT_TEXT]);
    expect(row("locasty").taglinePt).toBe(ptBR.projects.taglines.locasty);
    expect(row("dermatology-ai-platform").casePosition).toBe(1);
  });

  it("never puts back a field cleared in the backoffice", async () => {
    const { rows, row, deploy } = fakeDatabase();
    await deploy();
    Object.assign(row("jobradar-ai"), { tagline: "edited", taglinePt: null, featuresJson: "[]" });
    const edited = structuredClone(rows);
    expect(await deploy()).toContain("already ran");
    expect(rows).toEqual(edited);
  });

  it("never marks a case again, even one that lost its text", async () => {
    const { rows, row, deploy } = fakeDatabase();
    await deploy();
    for (const each of rows) each.casePosition = null;
    Object.assign(row("dermatology-ai-platform"), {
      caseProblemEn: null,
      caseProblemPt: null,
      caseWorkEn: null,
      caseWorkPt: null,
      caseResultEn: null,
      caseResultPt: null,
    });
    const edited = structuredClone(rows);
    await deploy();
    expect(rows).toEqual(edited);
  });
});
