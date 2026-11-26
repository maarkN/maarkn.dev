"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { TableRow } from "@/components/ui/table";

/** What answers a click by itself, inside a row: the row leaves it alone. */
const OWN = "a, button, input, select, textarea, label, summary, [role='button'], [role='checkbox'], [role='combobox'], [data-row-ignore]";

/**
 * A row that opens its record when clicked anywhere (spec admin-listing). The
 * keyboard does not need it: the row's `RowLink` is the same address, in the
 * order of the tab. A click on a control of the row is the control's, a click
 * that ends a text selection is a selection, and a click with a modifier or
 * the middle button opens a new tab, as on a link.
 */
export function OpensRow({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();

  function open(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target as Element;
    if (target.closest(OWN)) return;
    if (window.getSelection()?.toString()) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  }

  return (
    <TableRow
      data-opens=""
      className={className}
      onClick={open}
      onAuxClick={(event) => {
        if (event.button === 1) open(event);
      }}
    >
      {children}
    </TableRow>
  );
}
