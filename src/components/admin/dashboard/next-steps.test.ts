import { beforeEach, describe, expect, it, vi } from "vitest";

/** What counts as a next step among the interviews: only the scheduled ones. */

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({ interviews: [] as Record<string, unknown>[] }));

vi.mock("server-only", () => ({}));

/** Enough of a Prisma filter to answer the dashboard's questions honestly. */
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, filter]) => {
    if (key === "OR") return (filter as Row[]).some((option) => matches(row, option));
    if (key === "application") return true;
    if (filter !== null && typeof filter === "object") {
      const { not, gte } = filter as { not?: unknown; gte?: Date };
      if ("not" in (filter as Row)) return row[key] !== not;
      if (gte) return row[key] instanceof Date && (row[key] as Date) >= gte;
      throw new Error(`filter not covered: ${JSON.stringify(filter)}`);
    }
    return row[key] === filter;
  });
}

vi.mock("@/lib/db", () => {
  const found = ({ where = {} }: { where?: Row }) =>
    state.interviews.filter((row) => matches(row, where));
  const empty = { count: async () => 0, findMany: async () => [], groupBy: async () => [] };
  return {
    dbConfigured: true,
    db: {
      application: empty,
      radarHit: empty,
      interview: {
        findMany: async (args: { where?: Row }) => found(args),
        findFirst: async (args: { where?: Row }) => found(args)[0] ?? null,
        count: async (args: { where?: Row }) => found(args).length,
      },
    },
  };
});

const { loadFunnelSnapshot, loadNextSteps } = await import("./dashboard-data");

const AHEAD = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const BEHIND = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

function interview(id: string, over: Row): Row {
  return {
    id,
    kind: "technical",
    mode: null,
    scheduledAt: null,
    outcome: null,
    application: { id: "app_1", folderName: "acme", roleTitle: null, stage: "interview", company: null },
    ...over,
  };
}

beforeEach(() => {
  state.interviews = [
    interview("planned", { status: "planned" }),
    interview("scheduled", { status: "scheduled", scheduledAt: AHEAD }),
    interview("scheduled-behind", { status: "scheduled", scheduledAt: BEHIND, outcome: "pending" }),
    interview("completed", { status: "completed", scheduledAt: BEHIND }),
    interview("waiting-result", { status: "completed", scheduledAt: BEHIND, outcome: "pending" }),
    interview("cancelled", { status: "cancelled", scheduledAt: AHEAD }),
  ];
});

describe("interviews among the next steps", () => {
  it("are the scheduled ones, and the one whose date went by is flagged", async () => {
    const { items } = await loadNextSteps();
    expect(items.map(({ key, at, overdue }) => ({ key, at, overdue }))).toEqual([
      { key: "interview:scheduled", at: AHEAD, overdue: false },
      { key: "interview:scheduled-behind", at: BEHIND, overdue: true },
    ]);
  });

  it("a planned one shows up once it becomes scheduled", async () => {
    Object.assign(state.interviews[0], { status: "scheduled", scheduledAt: AHEAD });
    const { items } = await loadNextSteps();
    expect(items.map((item) => item.key)).toContain("interview:planned");
  });

  it("are the same ones the number of open interviews counts", async () => {
    const snapshot = await loadFunnelSnapshot();
    expect(snapshot).toMatchObject({ failed: false, interviewsOpen: 2, nextInterviewAt: AHEAD });
  });
});
