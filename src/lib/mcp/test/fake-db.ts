import { Prisma } from "@prisma/client";

/**
 * An in-memory stand-in for the few Prisma calls the application tools and the
 * rollback of a sync run make, so their tests run without a database (CI has
 * none). It holds the two CHECKs of the `dossier_fields` migration, with the
 * message Postgres gives: a write that the real database would refuse is
 * refused here too. What only a real Postgres can answer is in
 * `src/lib/dossier-db.test.ts`.
 */

type Row = Record<string, unknown> & { id: string };
type Where = Record<string, unknown>;

/** Equality on plain values; everything else a tool sends is not a filter here. */
function matches(row: Row, where: Where | undefined): boolean {
  return Object.entries(where ?? {}).every(([key, value]) =>
    value === null || typeof value !== "object" ? row[key] === value : true,
  );
}

class Table {
  rows: Row[] = [];
  private seq = 0;

  constructor(
    private readonly name: string,
    private readonly defaults: Record<string, unknown> | ((seq: number) => Record<string, unknown>) = {},
    private readonly check: (row: Row) => void = () => {},
  ) {}

  private save(row: Row, data: Where): Row {
    const next = { ...row };
    for (const [key, value] of Object.entries(data)) {
      // JSON null, as Prisma writes it.
      if (value !== undefined) next[key] = value === Prisma.DbNull ? null : value;
    }
    this.check(next);
    return next;
  }

  create = async ({ data }: { data: Where }): Promise<Row> => {
    this.seq += 1;
    const defaults = typeof this.defaults === "function" ? this.defaults(this.seq) : this.defaults;
    const row = this.save({ id: `${this.name}_${this.seq}`, ...defaults }, data);
    this.rows.push(row);
    return { ...row };
  };
  delete = async ({ where }: { where: Where }): Promise<Row> => {
    const index = this.rows.findIndex((row) => matches(row, where));
    if (index < 0) throw new Error(`${this.name}: no row to delete`);
    return this.rows.splice(index, 1)[0];
  };
  deleteMany = async ({ where }: { where?: Where } = {}): Promise<{ count: number }> => {
    const kept = this.rows.filter((row) => !matches(row, where));
    const count = this.rows.length - kept.length;
    this.rows = kept;
    return { count };
  };
  update = async ({ where, data }: { where: Where; data: Where }): Promise<Row> => {
    const index = this.rows.findIndex((row) => matches(row, where));
    if (index < 0) throw new Error(`${this.name}: no row to update`);
    this.rows[index] = this.save(this.rows[index], data);
    return { ...this.rows[index] };
  };
  updateMany = async ({ where, data }: { where: Where; data: Where }): Promise<{ count: number }> => {
    const found = this.rows.filter((row) => matches(row, where));
    for (const row of found) this.rows[this.rows.indexOf(row)] = this.save(row, data);
    return { count: found.length };
  };
  /** A taken `sourceKey` is refused, or skipped when the caller asks for it. */
  createManyAndReturn = async (args: { data: Where[]; skipDuplicates?: boolean }): Promise<Row[]> => {
    const created: Row[] = [];
    for (const data of args.data) {
      if (!this.rows.some((row) => row.sourceKey === data.sourceKey)) {
        created.push(await this.create({ data }));
      } else if (!args.skipDuplicates) {
        throw new Error(`UNIQUE ${this.name}.sourceKey`);
      }
    }
    return created;
  };
  upsert = async (args: { where: Where; create: Where; update: Where }): Promise<Row> =>
    this.rows.some((row) => matches(row, args.where))
      ? this.update({ where: args.where, data: args.update })
      : this.create({ data: args.create });
  findUnique = async ({ where }: { where: Where }): Promise<Row | null> => {
    const row = this.rows.find((candidate) => matches(candidate, where));
    return row ? { ...row } : null;
  };
  findMany = async (args: { where?: Where; orderBy?: unknown } = {}): Promise<Row[]> =>
    sort(
      this.rows.filter((row) => matches(row, args.where)).map((row) => ({ ...row })),
      args.orderBy,
    );
  findFirst = async (args: { where?: Where; orderBy?: unknown } = {}): Promise<Row | null> =>
    (await this.findMany(args))[0] ?? null;
  count = async (args: { where?: Where } = {}): Promise<number> =>
    (await this.findMany(args)).length;
  groupBy = async () => [];
}

/** What Prisma throws when Postgres refuses a row by a CHECK (the message only). */
function checkViolation(table: string, constraint: string): Error {
  return new Error(
    `Error occurred during query execution: new row for relation \\"${table}\\" violates check constraint \\"${constraint}\\"`,
  );
}

function sort(rows: Row[], orderBy: unknown): Row[] {
  const keys = (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []) as Record<
    string,
    "asc" | "desc"
  >[];
  return rows.sort((a, b) => {
    for (const key of keys) {
      const [field, direction] = Object.entries(key)[0];
      const [x, y] = [a[field], b[field]].map((v) => (v instanceof Date ? v.getTime() : v));
      if (x === y) continue;
      const order = x === null || x === undefined ? 1 : y === null || y === undefined ? -1 : x < y ? -1 : 1;
      return direction === "desc" ? -order : order;
    }
    return 0;
  });
}

export function createFakeDb() {
  const company = new Table("company", { aboutMd: null });
  const job = new Table("job");
  const contact = new Table("contact");
  const application = new Table(
    "application",
    {
      stage: "radar",
      closureReason: null,
      outcomeReason: null,
      projectInfoMd: null,
      companyId: null,
      jobId: null,
      updatedAt: new Date(0),
    },
    (row) => {
      if (row.closureReason && row.stage !== "rejected" && row.stage !== "withdrawn") {
        throw checkViolation("Application", "Application_closureReason_stage");
      }
    },
  );
  const interview = new Table(
    "interview",
    { status: "planned", orderIndex: 0, scheduledAt: null, interviewers: [], contactId: null },
    (row) => {
      const dated = row.scheduledAt !== null;
      if (row.status === "planned" ? dated : row.status !== "cancelled" && !dated) {
        throw checkViolation("Interview", "Interview_status_date");
      }
    },
  );
  const applicationEvent = new Table("applicationEvent");
  // Rows in the order they were recorded: the rollback reads them backwards.
  const provenance = new Table("provenance", (seq) => ({ recordedAt: new Date(seq) }));
  const syncRun = new Table("syncRun", () => ({ startedAt: new Date(), finishedAt: null }));
  const syncState = new Table("syncState");

  /** The relations `get_application` and `list_applications` read. */
  const withRelations = async (row: Row | null, include?: Where): Promise<Row | null> => {
    if (!row) return null;
    const interviews = (include?.interviews ?? {}) as { orderBy?: unknown };
    return {
      ...row,
      company: row.companyId ? await company.findUnique({ where: { id: row.companyId } }) : null,
      job: null,
      resumeTemplate: null,
      documents: [],
      contacts: [],
      checklistItems: [],
      screeningQuestions: [],
      requirementCoverages: [],
      honestyNotes: [],
      interviews: (
        await interview.findMany({ where: { applicationId: row.id }, orderBy: interviews.orderBy })
      ).map((item) => ({ ...item, contact: null })),
      events: (await applicationEvent.findMany({ where: { applicationId: row.id } })).map((event) => ({
        ...event,
      })),
    };
  };

  return {
    company,
    job,
    contact,
    application: Object.assign(Object.create(application) as Table, {
      findUnique: async (args: { where: Where; include?: Where }) =>
        args.include
          ? withRelations(await application.findUnique(args), args.include)
          : application.findUnique(args),
      findMany: async (args: { where?: Where; orderBy?: unknown }) =>
        Promise.all((await application.findMany(args)).map((row) => withRelations(row))),
    }),
    interview,
    applicationEvent,
    provenance,
    syncRun,
    syncState,
    /** The operations already ran, one after the other; none fails here halfway. */
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
    /** The raw rows, for assertions. */
    rows: {
      company: () => company.rows,
      application: () => application.rows,
      interview: () => interview.rows,
      applicationEvent: () => applicationEvent.rows,
      provenance: () => provenance.rows,
    },
  };
}

export type FakeDb = ReturnType<typeof createFakeDb>;
