"use client";

/**
 * The board of applications: six columns (`BOARD_COLUMNS`), the open
 * applications in them, moved by dragging or by the arrows.
 *
 * ── A move is shown at once, and taken back if the server refuses ─────────
 * The card goes to its new column before the server answers (`useOptimistic`).
 * The action records the stage and the history (`moveApplicationStage`) and
 * revalidates the board, which arrives in the same transition; if it refuses,
 * the transition ends with the props unchanged, and the card is back in its
 * column, with a notice that says why and offers to try again. A move that
 * went through says so, with "Desfazer", which undoes that move
 * (`undoApplicationStageMove`, with the event the move recorded): the exact
 * stage it had, and no date of sending the move stamped.
 *
 * The card lands where the server will put it (`placeCard`): a card the answer
 * puts in another place is moved in the DOM again, which takes the focus off
 * it and back, and a screen reader announces it twice.
 *
 * ── The keyboard ───────────────────────────────────────────────────────────
 * Every card is a link to its dossier, in the order of the tab. With one in
 * focus, ← and → take it to the column beside, and the focus goes with it.
 * The keys are written above the board (A13), and every card points to that
 * sentence (`aria-describedby`).
 */

import { useEffect, useId, useOptimistic, useRef, useState, useTransition, type DragEvent } from "react";
import type { FunnelStage } from "@prisma/client";
import type { ActionResult } from "@/app/_actions/action-result";
import { useAdminFormat, useCommonLabels } from "@/components/admin/admin-locale";
import { useNotify } from "@/components/admin/notify";
import type { AdminDictionary } from "@/i18n/config";
import { BOARD_COLUMNS, dropStageOf, neighbourColumn, type BoardColumnKey } from "@/lib/admin/funnel";
import { counted, fill } from "@/lib/admin/text";
import { KanbanCard } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";
import type { BoardCard, BoardData, StageMove } from "./kanban-types";

export type BoardWords = {
  board: AdminDictionary["board"];
  vocab: Pick<AdminDictionary["vocab"], "stage" | "phase" | "column">;
  priority: string;
};

type Columns = BoardData["columns"];
type Move = { id: string; to: BoardColumnKey; stage: FunnelStage };
type MoveAction = (id: string, stage: FunnelStage) => Promise<ActionResult<StageMove>>;
type UndoAction = (id: string, eventId: string) => Promise<ActionResult>;
/** A move that undoes another: the event it undoes, and the column the card is in now. */
type Undoing = { eventId: string; from: BoardColumnKey };

/** Priority 1 first, no priority last: the order of `loadBoard`. */
const rank = (card: BoardCard) => card.priority ?? Number.POSITIVE_INFINITY;

/**
 * The card leaves wherever it is and goes to `to`, with its new stage; the
 * counts follow. It goes where the server will put it: first among the cards
 * of its priority, since it is the one updated last (`loadBoard` orders by
 * priority, then by `updatedAt`).
 */
export function placeCard(columns: Columns, { id, to, stage }: Move): Columns {
  const next = { ...columns };
  let moved: BoardCard | undefined;
  for (const { key } of BOARD_COLUMNS) {
    const card = next[key].cards.find((c) => c.id === id);
    if (!card) continue;
    moved = card;
    next[key] = { count: next[key].count - 1, cards: next[key].cards.filter((c) => c.id !== id) };
  }
  if (!moved) return columns;
  const placed = { ...moved, stage };
  const cards = [...next[to].cards];
  const at = cards.findIndex((c) => rank(c) >= rank(placed));
  cards.splice(at === -1 ? cards.length : at, 0, placed);
  next[to] = { count: next[to].count + 1, cards };
  return next;
}

export function KanbanBoard({
  data,
  words,
  cap,
  moveAction,
  undoAction,
}: {
  data: BoardData;
  words: BoardWords;
  /** Cards per column, as the server cut them. */
  cap: number;
  /** REFERENCES to the Server Actions (AGENTS.md §6): serializable. */
  moveAction: MoveAction;
  undoAction: UndoAction;
}) {
  const [columns, addMove] = useOptimistic(data.columns, placeCard);
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<BoardColumnKey | null>(null);
  /** The card moved by the keyboard, the column the key found it in, and whether a commit has shown it gone. */
  const focusAfter = useRef<{ id: string; from: BoardColumnKey; seen: boolean } | null>(null);
  const notify = useNotify();
  const common = useCommonLabels();
  const { formatNumber } = useAdminFormat();
  const keys = useId();
  const { board, vocab } = words;

  // A card moved by the keyboard is a new element in another column, and
  // whatever moves it again (a refusal sends it back) takes the focus off it:
  // while its move is under way, a focus that fell on nothing goes back to its
  // link. A commit from before the move (the card still in the column the key
  // found it in) does not count, and the move is over when every transition of
  // the board is: then the card is where the server put it.
  useEffect(() => {
    const want = focusAfter.current;
    if (!want) return;
    if (!want.seen) {
      const now = locate(want.id)?.column;
      if (now === want.from) return;
      want.seen = true;
    }
    const link = document.querySelector<HTMLElement>(`[data-card="${want.id}"] [data-card-link]`);
    const active = document.activeElement;
    if (link && link !== active && (!active || active === document.body)) link.focus();
    if (!isPending) focusAfter.current = null;
  });

  function locate(id: string): { card: BoardCard; column: BoardColumnKey } | null {
    for (const { key } of BOARD_COLUMNS) {
      const card = columns[key].cards.find((c) => c.id === id);
      if (card) return { card, column: key };
    }
    return null;
  }

  /**
   * @param undoing when the move undoes another: the card is found where it
   *   was before, the server undoes that move, and a refusal names where it stays.
   * @returns whether the move started.
   */
  function move(id: string, to: BoardColumnKey, stage: FunnelStage = dropStageOf(to), undoing?: Undoing): boolean {
    const found = locate(id);
    if (!found || (found.column === to && !undoing)) return false;
    const { card } = found;
    const from = undoing?.from ?? found.column;
    const name = card.company;
    startTransition(async () => {
      addMove({ id, to, stage });
      const call: Promise<ActionResult<StageMove>> = undoing ? undoAction(id, undoing.eventId) : moveAction(id, stage);
      const result = await call.catch((): ActionResult<StageMove> => ({ ok: false, message: common.failed }));
      if (!result.ok) {
        notify.error(fill(board.failed, { name, column: vocab.column[from] }), {
          detail: result.message,
          action: { label: common.retry, onClick: () => move(id, to, stage, undoing) },
        });
        return;
      }
      if (undoing) {
        notify.success(fill(board.unmoved, { name, column: vocab.column[to] }));
        return;
      }
      // No event, no move to undo: the server found it there already.
      const eventId = result.data?.eventId;
      notify.success(
        fill(board.moved, { name, column: vocab.column[to] }),
        eventId ? { action: { label: common.undo, onClick: () => move(id, from, card.stage, { eventId, from: to }) } } : undefined,
      );
    });
    return true;
  }

  function dropOn(key: BoardColumnKey) {
    return {
      onDragOver(event: DragEvent<HTMLElement>) {
        if (!dragging) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        if (over !== key) setOver(key);
      },
      onDragLeave(event: DragEvent<HTMLElement>) {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null);
      },
      onDrop(event: DragEvent<HTMLElement>) {
        event.preventDefault();
        const id = dragging ?? event.dataTransfer?.getData("text/plain");
        setOver(null);
        setDragging(null);
        if (id) move(id, key);
      },
    };
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1 text-sm">
        <p className="text-foreground">
          {counted(board.total, data.total, formatNumber(data.total))}{" "}
          <span className="text-muted-foreground">{fill(board.cap, { cap: formatNumber(cap) })}</span>
        </p>
        <p id={keys} className="text-muted-foreground">
          {board.keys}
        </p>
      </div>

      <div className="-mx-2 overflow-x-auto pb-3" data-board="">
        <div className="flex items-start gap-3">
          {BOARD_COLUMNS.map(({ key }) => {
            const column = columns[key];
            const hidden = column.count - column.cards.length;
            return (
              <KanbanColumn
                key={key}
                name={vocab.column[key]}
                count={column.count}
                countText={fill(board.column, { name: vocab.column[key], count: formatNumber(column.count) })}
                hiddenText={hidden > 0 ? counted(board.hidden, hidden, formatNumber(hidden)) : undefined}
                emptyText={board.none}
                over={over === key}
                {...dropOn(key)}
              >
                {column.cards.map((card) => (
                  <KanbanCard
                    key={card.id}
                    card={card}
                    words={vocab}
                    priorityLabel={words.priority}
                    describedBy={keys}
                    dragging={dragging === card.id}
                    onDragStart={(event) => {
                      setDragging(card.id);
                      event.dataTransfer?.setData("text/plain", card.id);
                      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
                      const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
                      if (!step) return;
                      const next = neighbourColumn(key, step);
                      event.preventDefault();
                      if (!next) return;
                      if (move(card.id, next)) focusAfter.current = { id: card.id, from: key, seen: false };
                    }}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
      </div>
    </div>
  );
}
