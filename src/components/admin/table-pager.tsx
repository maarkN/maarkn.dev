/**
 * What every list of the backoffice shares around its table: the pager, with
 * its keys written on it, and the rows that stand for the states of the list.
 *
 * NOTE ON "use client": this module deliberately has no directive.
 * - `TablePager` takes an `onPageChange` callback and binds a keydown
 *   listener, so it is rendered from a Client Component (the toolbar that owns
 *   the URL, AGENTS.md §4.2), which pulls it into the client graph.
 * - `TableStateRow` is markup, and stays on the server when a Server Component
 *   renders it.
 */

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAdminFormat, useCommonLabels } from "@/components/admin/admin-locale";
import { counted, fill } from "@/lib/admin/text";
import { cn } from "@/lib/utils";

/* ── the pager ───────────────────────────────────────────────────────────── */

interface TablePagerProps {
  /** 1-based current page. */
  page: number;
  /** Total number of pages (at least 1 on screen). */
  totalPages: number;
  /** Total number of records, when it is known. */
  total?: number;
  onPageChange: (page: number) => void;
  /** Locks both buttons, while a transition is pending. */
  disabled?: boolean;
}

/**
 * `74 registros · Página 2 de 4   [Anterior P] [Próxima N]`
 *
 * The keys are written on the buttons that they press (A13): a shortcut that
 * is not on screen does not exist. Each button's name is its visible word, and
 * `aria-keyshortcuts` tells the key to whoever cannot see it.
 */
export function TablePager({ page, totalPages, total, onPageChange, disabled }: TablePagerProps) {
  const { formatNumber } = useAdminFormat();
  const { pager } = useCommonLabels();
  const lastPage = Math.max(totalPages, 1);
  const canNext = !disabled && page < lastPage;
  const canPrev = !disabled && page > 1;

  useListingShortcut(canNext ? () => onPageChange(page + 1) : null, canPrev ? () => onPageChange(page - 1) : null);

  return (
    <nav aria-label={pager.label} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-4 font-text text-sm">
      <p className="text-muted-foreground tabular-nums">
        {total !== undefined && `${counted(pager.total, total, formatNumber(total))} · `}
        {fill(pager.position, { page: formatNumber(page), pages: formatNumber(lastPage) })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          aria-keyshortcuts="p"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          {pager.previous}
          <kbd className="admin-kbd" aria-hidden="true">
            P
          </kbd>
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-keyshortcuts="n"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          {pager.next}
          <kbd className="admin-kbd" aria-hidden="true">
            N
          </kbd>
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

/**
 * Binds `n` and `p` outside an editable field.
 *
 * The risk is typing `n` in the search and changing page: the handler is on the
 * `document`, so it asks where the focus is. `INPUT`, `TEXTAREA`, `SELECT`,
 * `contenteditable` and the ARIA roles of a field (the Radix `<Select>` is a
 * `<button role="combobox">`) are left out, and so is any combination with a
 * modifier: `Ctrl+N` is the browser's.
 */
function useListingShortcut(onNext: (() => void) | null, onPrev: (() => void) | null) {
  // One listener, on the `document`; the actions change with the page and reach
  // it through this ref, written in an effect (`react-hooks/refs`).
  const actions = React.useRef({ onNext, onPrev });
  React.useEffect(() => {
    actions.current = { onNext, onPrev };
  });

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (isEditableTarget(document.activeElement)) return;
      // A window is open over the list: its keys are its own.
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return;
      const key = event.key.toLowerCase();
      if (key !== "n" && key !== "p") return;
      // Even with nothing to do: on the last page, `n` neither moves nor types.
      event.preventDefault();
      const run = key === "n" ? actions.current.onNext : actions.current.onPrev;
      run?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const EDITABLE_ROLES = new Set(["textbox", "searchbox", "combobox", "spinbutton", "listbox", "menu", "menuitem", "option"]);

/** Exported for the test: it is the whole rule of the shortcut. */
export function isEditableTarget(element: Element | null): boolean {
  if (!element) return false;
  if (EDITABLE_TAGS.has(element.tagName)) return true;
  const role = element.getAttribute("role");
  if (role && EDITABLE_ROLES.has(role)) return true;
  // `isContentEditable` catches the inherited case; the attribute the direct one,
  // and is the only one of the two that jsdom implements.
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  const editable = element.getAttribute("contenteditable");
  return editable !== null && editable !== "false";
}

/* ── the states of a list ────────────────────────────────────────────────── */

/**
 * The four states a list tells apart (spec admin-listing), each with the next
 * step: no record yet (create one), nothing for the filters (clear them), the
 * reading failed (try again; never "empty"), and loading.
 */
export type TableState = "loading" | "empty" | "filtered" | "failed";

/** The next step of a state: a link, with its words. */
export type StateAction = { href: string; label: string };

/**
 * The sentence that says which state a list is in, and its next step. Loading
 * is a bar drawn in full and revealed by an animated clip, whose last frame
 * (the one left under reduced motion) is the full bar; the sentence is what a
 * screen reader receives.
 */
export function StateMessage({
  state,
  message,
  action,
  className,
}: {
  state: TableState;
  message: string;
  action?: StateAction;
  className?: string;
}) {
  return (
    <div
      role={state === "loading" ? "status" : undefined}
      data-list-state={state}
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 font-text text-base text-foreground", className)}
    >
      {state === "failed" && <span aria-hidden="true" className="size-2.5 shrink-0 rotate-45 bg-destructive" />}
      <span className="max-w-[60ch]">{message}</span>
      {state === "loading" && <span className="admin-progress" aria-hidden="true" />}
      {action && (
        <Button asChild variant={state === "empty" ? "default" : "outline"}>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

/** A row across the whole table that says which state the list is in. */
export function TableStateRow({
  cols,
  ...state
}: {
  cols: number;
  state: TableState;
  message: string;
  action?: StateAction;
}) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-8">
        <StateMessage {...state} />
      </TableCell>
    </TableRow>
  );
}

/* TEMPORARY-R09: the old pieces, until every screen is migrated. */
export const LISTING_INDEX_WIDTH = "";
export function ListingIndexHead() {
  return null;
}
export function ListingIndexCell(props: { index: number }) {
  void props;
  return null;
}
export function TableLoadingRow({ cols }: { cols: number }) {
  return <TableStateRow cols={cols} state="loading" message="…" />;
}
export function TableEmptyRow({ cols, message = "—", destructive }: { cols: number; message?: string; destructive?: boolean }) {
  return <TableStateRow cols={cols} state={destructive ? "failed" : "empty"} message={message} />;
}
