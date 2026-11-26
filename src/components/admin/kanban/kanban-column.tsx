"use client";

import type { DragEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A column of the board. Its header tells the TRUTH: the count is the real one,
 * from the database, and not the number of cards on screen, which stops at the
 * cap. What is past the cap is counted below the cards. Content, so solid; the
 * whole column is a place to drop a card.
 */
export function KanbanColumn({
  name,
  count,
  countText,
  hiddenText,
  emptyText,
  over,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: {
  name: string;
  count: number;
  /** "Em conversa: 4", for the region's name. */
  countText: string;
  /** "Mais 5 não aparecem aqui.", when the column is past its cap. */
  hiddenText?: string;
  emptyText: string;
  /** A card is being dragged over it. */
  over: boolean;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  children?: ReactNode;
}) {
  const empty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <section
      aria-label={countText}
      data-column={name}
      data-drop-target={over ? "" : undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-3 border border-transparent p-2 transition-colors",
        over && "border-dashed border-ring bg-accent",
      )}
    >
      <header className="flex items-baseline justify-between gap-3 px-2 pt-1">
        <h2 className="font-text text-base font-semibold text-foreground">
          {name}
        </h2>
        <span className="font-label text-sm text-muted-foreground tabular-nums">{count}</span>
      </header>
      {empty ? (
        <p className="px-2 py-6 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-3">{children}</ul>
      )}
      {hiddenText && <p className="px-2 text-sm text-foreground">{hiddenText}</p>}
    </section>
  );
}
