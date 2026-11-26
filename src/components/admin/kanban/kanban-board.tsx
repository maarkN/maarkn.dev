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
 * went through says so, with "Desfazer", which moves it back to the exact stage
 * it had.
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
import type { BoardCard, BoardData } from "./kanban-types";

export type BoardWords = {
  board: AdminDictionary["board"];
  vocab: Pick<AdminDictionary["vocab"], "stage" | "phase" | "column">;
  priority: string;
};

type Columns = BoardData["columns"];
type Move = { id: string; to: BoardColumnKey; stage: FunnelStage };

/** The card leaves wherever it is and goes to the top of `to`, with its new stage; the counts follow. */
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
  next[to] = { count: next[to].count + 1, cards: [{ ...moved, stage }, ...next[to].cards] };
  return next;
}

export function KanbanBoard({
  data,
  words,
  cap,
  moveAction,
}: {
  data: BoardData;
  words: BoardWords;
  /** Cards per column, as the server cut them. */
  cap: number;
  /** A REFERENCE to the Server Action (AGENTS.md §6): serializable. */
  moveAction: (id: string, stage: FunnelStage) => Promise<ActionResult>;
}) {
  const [columns, addMove] = useOptimistic(data.columns, placeCard);
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<BoardColumnKey | null>(null);
  const focusAfter = useRef<string | null>(null);
  const notify = useNotify();
  const common = useCommonLabels();
  const { formatNumber } = useAdminFormat();
  const keys = useId();
  const { board, vocab } = words;

  // A card that moved by the keyboard is a new element in another column: the
  // focus goes back to it once it is there.
  useEffect(() => {
    const id = focusAfter.current;
    if (!id) return;
    const link = document.querySelector<HTMLElement>(`[data-card="${id}"] [data-card-link]`);
    if (!link) return;
    focusAfter.current = null;
    link.focus();
  });

  function locate(id: string): { card: BoardCard; column: BoardColumnKey } | null {
    for (const { key } of BOARD_COLUMNS) {
      const card = columns[key].cards.find((c) => c.id === id);
      if (card) return { card, column: key };
    }
    return null;
  }

  /**
   * @param undoing the column the card is in now, when the move undoes another:
   *   the card is found where it was before, and the refusal names where it stays.
   */
  function move(id: string, to: BoardColumnKey, stage: FunnelStage = dropStageOf(to), undoing?: BoardColumnKey) {
    const found = locate(id);
    if (!found || (found.column === to && !undoing)) return;
    const { card } = found;
    const from = undoing ?? found.column;
    const name = card.company;
    startTransition(async () => {
      addMove({ id, to, stage });
      const result = await moveAction(id, stage).catch((): ActionResult => ({ ok: false, message: common.failed }));
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
      notify.success(fill(board.moved, { name, column: vocab.column[to] }), {
        action: { label: common.undo, onClick: () => move(id, from, card.stage, to) },
      });
    });
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
                      focusAfter.current = card.id;
                      move(card.id, next);
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
