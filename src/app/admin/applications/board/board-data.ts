import "server-only";

/**
 * What the board reads: the open applications, in the six columns of
 * `BOARD_COLUMNS` (`@/lib/admin/funnel`).
 *
 * The filter is the list's (`buildApplicationWhere`): the board does not
 * reimplement any. That matters more than it seems: the visa filter is
 * EFFECTIVE (the application overrides the job, whose default is `silent`), and
 * a second copy of that clause would make the board and the list disagree.
 *
 * 1. One `groupBy` brings the REAL count of each stage, summed per column.
 *    That is what the header of a column says: counting the cards would lie as
 *    soon as a column passed its cap.
 * 2. Only the columns with something in them fetch cards, in parallel, with
 *    `take: BOARD_CARDS_PER_COLUMN`. One query per column, never one global
 *    `findMany` with a cap: ordered by stage, the radar alone would eat the cap
 *    and the next columns would come empty with a positive count.
 */

import type { Prisma } from "@prisma/client";
import { db, dbConfigured } from "@/lib/db";
import { safeDbError } from "@/lib/safe-error";
import { BOARD_COLUMNS, BOARD_STAGES, type BoardColumnKey } from "@/lib/admin/funnel";
import { buildApplicationWhere, type ApplicationFilters } from "@/lib/applications-query";
import { emptyBoard, type BoardCard, type BoardData } from "@/components/admin/kanban/kanban-types";

/** Cards per column. The rest is counted, and is on the list, which pages. */
export const BOARD_CARDS_PER_COLUMN = 25;

/** Mirrors `BoardCard`: the assignment below has no `as`, so a drift breaks the build. */
const CARD_SELECT = {
  id: true,
  folderName: true,
  stage: true,
  roleTitle: true,
  market: true,
  priority: true,
  followUp: true,
  company: { select: { name: true } },
  job: { select: { title: true, market: true, locationText: true } },
} satisfies Prisma.ApplicationSelect;

export async function loadBoard(filters: ApplicationFilters): Promise<BoardData> {
  // A3: `next build` runs without DATABASE_URL: degrade, never throw.
  if (!dbConfigured) return emptyBoard(true);

  const where: Prisma.ApplicationWhereInput = {
    AND: [buildApplicationWhere(filters), { stage: { in: [...BOARD_STAGES] } }],
  };
  try {
    const grouped = await db.application.groupBy({ by: ["stage"], where, _count: { _all: true } });
    const board = emptyBoard(false);
    for (const row of grouped) {
      const column = BOARD_COLUMNS.find((c) => c.stages.includes(row.stage));
      if (!column) continue;
      board.columns[column.key].count += row._count._all;
      board.total += row._count._all;
    }

    const filled = BOARD_COLUMNS.filter((column) => board.columns[column.key].count > 0);
    const lists = await Promise.all(
      filled.map((column) =>
        db.application.findMany({
          where: { AND: [where, { stage: { in: [...column.stages] } }] },
          select: CARD_SELECT,
          orderBy: [{ priority: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }, { id: "asc" }],
          take: BOARD_CARDS_PER_COLUMN,
        }),
      ),
    );
    filled.forEach((column, index) => {
      board.columns[column.key as BoardColumnKey].cards = lists[index].map(toCard);
    });
    return board;
  } catch (err) {
    console.error("[admin] load applications board failed", safeDbError(err));
    return emptyBoard(true);
  }
}

function toCard(row: Prisma.ApplicationGetPayload<{ select: typeof CARD_SELECT }>): BoardCard {
  const market = row.market ?? row.job?.market ?? null;
  return {
    id: row.id,
    company: row.company?.name ?? row.folderName,
    role: row.roleTitle || row.job?.title || null,
    stage: row.stage,
    place: [market, row.job?.locationText].filter(Boolean).join(" · ") || null,
    priority: row.priority,
    followUp: row.followUp,
  };
}
