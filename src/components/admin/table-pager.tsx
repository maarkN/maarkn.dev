/**
 * Table chrome shared by every backoffice list page: footer pager, loading
 * skeleton rows and the empty/error row.
 *
 * NOTE ON "use client": this module deliberately has no directive.
 * - `TablePager` takes an `onPageChange` callback, so it can only be rendered
 *   from a Client Component — importing it there pulls it into the client
 *   graph automatically. See `src/app/admin/AGENTS.md` for the canonical
 *   "filters + pager in one small client component" recipe.
 * - `TableSkeletonRows` / `TableEmptyRow` are pure markup and stay on the
 *   server when a Server Component imports them.
 * Adding "use client" here would force all three into the client bundle for
 * no gain.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";

interface TablePagerProps {
  /** 1-based current page. */
  page: number;
  /** Total number of pages (clamped to >= 1 for display). */
  totalPages: number;
  /** Total record count, shown when available. */
  total?: number;
  onPageChange: (page: number) => void;
  /** Locks both buttons — use while a transition is pending. */
  disabled?: boolean;
}

/** Footer pagination for list pages: "N registro(s) · Página X de Y" + anterior/próxima. */
export function TablePager({
  page,
  totalPages,
  total,
  onPageChange,
  disabled,
}: TablePagerProps) {
  const lastPage = Math.max(totalPages, 1);
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <div className="text-sm text-muted-foreground">
        {total !== undefined && (
          <span className="tabular-nums">{formatNumber(total)} registro(s) · </span>
        )}
        <span className="tabular-nums">
          Página {page} de {lastPage}
        </span>
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Skeleton rows while a table query loads (the `isLoading` state). */
export function TableSkeletonRows({
  rows = 6,
  cols,
}: {
  rows?: number;
  cols: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <TableRow key={`skeleton-row-${r}`}>
          {Array.from({ length: cols }, (_, c) => (
            <TableCell key={`skeleton-cell-${r}-${c}`}>
              <Skeleton className="h-4 w-full max-w-40" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Full-width empty/error row. Pass `destructive` for the error state. */
export function TableEmptyRow({
  cols,
  message = "Nenhum registro encontrado.",
  destructive,
}: {
  cols: number;
  message?: string;
  destructive?: boolean;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={cols}
        className={
          destructive
            ? "py-8 text-center text-destructive"
            : "py-8 text-center text-muted-foreground"
        }
      >
        {message}
      </TableCell>
    </TableRow>
  );
}
