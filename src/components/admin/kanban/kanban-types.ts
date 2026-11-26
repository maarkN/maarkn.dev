/**
 * What the board of applications carries from the server to the browser.
 *
 * Client-safe on purpose: the card and the column are rendered in the browser
 * (dragging, the arrows, the optimistic move), and the loader
 * (`src/app/admin/applications/board/board-data.ts`) is `server-only`. The type
 * of the card lives here, in between, so that neither side depends on the other.
 * `import type` from Prisma: its runtime never reaches the bundle.
 */

import type { ClosureReason, FunnelStage } from "@prisma/client";
import { BOARD_COLUMNS, type BoardColumnKey } from "@/lib/admin/funnel";

/** The least a card needs. No long markdown: the board is a dense view. */
export type BoardCard = {
  id: string;
  company: string;
  role: string | null;
  stage: FunnelStage;
  /** Market and location, already joined. */
  place: string | null;
  priority: number | null;
  /** What to chase, as Marco wrote it. */
  followUp: string | null;
};

export type BoardColumnData = {
  /** The REAL count (a `groupBy`), not the number of cards on screen. */
  count: number;
  /** At most `BOARD_CARDS_PER_COLUMN`. */
  cards: BoardCard[];
};

/**
 * What a move of the board answers: the event it recorded, which is what
 * "Desfazer" undoes. `reopened` when the application had been closed since the
 * board loaded (a card shows only open ones): the stage the move found and the
 * closure reason it removed.
 */
export type StageMove = { eventId: string; reopened?: { from: FunnelStage; reason: ClosureReason } };

/** What undoing a move answers when it put back the closure reason that move removed. */
export type StageUndo = { restored?: { stage: FunnelStage; reason: ClosureReason } };

export type BoardData = {
  columns: Record<BoardColumnKey, BoardColumnData>;
  total: number;
  /** The reading failed, or there is no `DATABASE_URL` (A3). */
  failed: boolean;
};

export function emptyBoard(failed: boolean): BoardData {
  const columns = {} as Record<BoardColumnKey, BoardColumnData>;
  for (const { key } of BOARD_COLUMNS) columns[key] = { count: 0, cards: [] };
  return { columns, total: 0, failed };
}
