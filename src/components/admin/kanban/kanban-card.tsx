"use client";

import type { DragEvent, KeyboardEvent } from "react";
import Link from "next/link";
import clsx from "clsx";
import { HoloFrame } from "@/components/holo/frame";
import styles from "@/components/holo/holo.module.css";
import { StageLabel, type StageWords } from "@/components/admin/stage";
import { fill } from "@/lib/admin/text";
import type { BoardCard } from "./kanban-types";

/**
 * A card of the board: a hologram, because it answers (it opens the dossier,
 * it is dragged, the arrows move it). Its one target is the link with the name
 * of the company, stretched over the whole card; the stage is written with the
 * mark of its phase.
 */
export function KanbanCard({
  card,
  words,
  priorityLabel,
  describedBy,
  dragging,
  onKeyDown,
  onDragStart,
  onDragEnd,
}: {
  card: BoardCard;
  words: StageWords;
  /** "Prioridade {n} (1 é a maior)". */
  priorityLabel: string;
  /** The id of the sentence that says what the arrows do. */
  describedBy: string;
  dragging: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLAnchorElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <li
      data-card={card.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={clsx(styles.holo, styles.panel, styles.card, "admin-board-card", dragging && "opacity-45")}
      data-holo="card"
    >
      <div className={styles.tilt}>
        <HoloFrame kind="panel" seed={card.company} />
        <div className="relative space-y-1.5 px-4 pt-3.5 pb-3.5">
          <h3 className="font-text text-base leading-snug font-semibold">
            <Link
              href={`/admin/applications/${card.id}`}
              data-card-link=""
              className={styles.stretched}
              aria-describedby={describedBy}
              onKeyDown={onKeyDown}
              draggable={false}
            >
              {card.company}
            </Link>
          </h3>
          {card.role && <p className="line-clamp-2 text-sm text-muted-foreground">{card.role}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-sm">
            <StageLabel stage={card.stage} words={words} />
            {card.priority != null && (
              <span className="font-label text-xs text-foreground" title={fill(priorityLabel, { n: card.priority })}>
                P{card.priority}
              </span>
            )}
          </div>
          {card.place && <p className="truncate text-sm text-muted-foreground">{card.place}</p>}
          {card.followUp && <p className="line-clamp-2 text-sm text-foreground">{card.followUp}</p>}
        </div>
      </div>
    </li>
  );
}
