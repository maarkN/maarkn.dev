/**
 * What the board reads (spec admin-listing, "Coluna cheia"): the header of a
 * column says the REAL count, the stages of the column summed from one
 * `groupBy`, not the cards that came, which stop at the cap; and only the
 * columns with something in them fetch cards.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FunnelStage } from "@prisma/client";

const groupBy = vi.fn();
const findMany = vi.fn();
let configured = true;
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  get dbConfigured() {
    return configured;
  },
  db: { application: { groupBy: (...a: unknown[]) => groupBy(...a), findMany: (...a: unknown[]) => findMany(...a) } },
}));

const { BOARD_CARDS_PER_COLUMN, loadBoard } = await import("./board-data");

const row = (id: string, stage: FunnelStage) => ({
  id,
  folderName: id,
  stage,
  roleTitle: "Backend Engineer",
  market: null,
  priority: null,
  followUp: null,
  company: { name: id.toUpperCase() },
  job: null,
});

beforeEach(() => {
  configured = true;
  groupBy.mockReset();
  findMany.mockReset();
});

describe("loadBoard", () => {
  it("counts each column by its stages, past the cards that came", async () => {
    groupBy.mockResolvedValue([
      { stage: "radar", _count: { _all: 31 } },
      { stage: "shortlisted", _count: { _all: 2 } },
      { stage: "package_drafting", _count: { _all: 1 } },
      { stage: "interview", _count: { _all: 3 } },
      { stage: "final_interview", _count: { _all: 1 } },
    ]);
    // What a column with a cap brings: never more than the cap.
    findMany.mockImplementation(async ({ where }: { where: { AND: [unknown, { stage: { in: FunnelStage[] } }] } }) =>
      where.AND[1].stage.in.includes("radar") ? [row("a", "radar"), row("b", "shortlisted")] : [row("c", "interview")],
    );

    const board = await loadBoard({} as never);
    expect(board.failed).toBe(false);
    expect(board.columns.selected.count).toBe(34);
    expect(board.columns.selected.cards.map((c) => c.id)).toEqual(["a", "b"]);
    expect(board.columns.evaluation.count).toBe(4);
    expect(board.columns.sent).toEqual({ count: 0, cards: [] });
    expect(board.total).toBe(38);
  });

  it("asks for cards only in the columns that have some, each with the cap", async () => {
    groupBy.mockResolvedValue([{ stage: "applied", _count: { _all: 40 } }]);
    findMany.mockResolvedValue([]);
    await loadBoard({} as never);
    expect(findMany).toHaveBeenCalledTimes(1);
    const [{ where, take }] = findMany.mock.calls[0];
    expect(where.AND[1]).toEqual({ stage: { in: ["applied"] } });
    expect(take).toBe(BOARD_CARDS_PER_COLUMN);
  });

  it("leaves the stages that closed an application out of the board", async () => {
    groupBy.mockResolvedValue([]);
    await loadBoard({} as never);
    const [{ where }] = groupBy.mock.calls[0];
    const stages: FunnelStage[] = where.AND[1].stage.in;
    expect(stages).not.toContain("rejected");
    expect(stages).not.toContain("accepted");
    expect(stages).toContain("offer");
  });

  it("says it failed, without a database or when the database does not answer", async () => {
    configured = false;
    expect((await loadBoard({} as never)).failed).toBe(true);
    configured = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    groupBy.mockRejectedValue(new Error("down"));
    expect((await loadBoard({} as never)).failed).toBe(true);
    log.mockRestore();
  });
});
