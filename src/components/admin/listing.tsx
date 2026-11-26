/**
 * The pieces of a list that are markup: the header that orders it and the link
 * that opens a record. Server-safe; the row that opens on a click is
 * `OpensRow`, a client component of its own (`./opens-row`).
 */

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import type { SortDir } from "@/lib/admin/sort";
import { cn } from "@/lib/utils";

export { OpensRow } from "./opens-row";

/**
 * A column header that orders the list. The order is on the header itself
 * (`aria-sort`), which is what a screen reader announces with the column; the
 * link inside is named by the column, and its title says what it does.
 */
export function SortableHead({
  label,
  title,
  href,
  dir,
  className,
}: {
  label: string;
  /** "Ordenar por empresa". */
  title: string;
  href: string;
  /** The direction, when the list is ordered by this column. */
  dir?: SortDir;
  className?: string;
}) {
  const Arrow = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <TableHead
      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
      className={className}
    >
      <Link
        href={href}
        scroll={false}
        title={title}
        className="inline-flex min-h-6 items-center gap-1 hover:text-foreground hover:underline hover:decoration-brand hover:underline-offset-4"
      >
        {label}
        <Arrow aria-hidden="true" className={cn("size-3.5", !dir && "opacity-60")} />
      </Link>
    </TableHead>
  );
}

/** The link that opens the record of a row: the keyboard's way to what a click on the row does. */
export function RowLink({
  href,
  title,
  className,
  children,
}: {
  href: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} title={title} className={cn("admin-row-link", className)}>
      {children}
    </Link>
  );
}
