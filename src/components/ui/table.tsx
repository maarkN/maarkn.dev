"use client"

import * as React from "react"

import { observeSize } from "@/components/holo/size-observer"
import { cn } from "@/lib/utils"

/**
 * A list of the backoffice is a table, and stays one: headers tied to their
 * cells, navigable as a table by a screen reader. Content, so solid: the row
 * that opens a record answers to the pointer (`admin-table` in
 * src/app/admin/admin.css), and what it opens is a link inside it.
 *
 * The container, not the document, is what scrolls horizontally. While there is
 * something to scroll it is a tab stop: a table without controls gives the
 * keyboard nothing else to hold on to, and not every browser makes a scrolling
 * box focusable by itself.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [scrolls, setScrolls] = React.useState(false)

  React.useEffect(() => {
    const container = ref.current
    const table = container?.firstElementChild
    if (!container || !table) return
    const measure = () => setScrolls(container.scrollWidth > container.clientWidth)
    const stops = [observeSize(container, measure), observeSize(table, measure)]
    return () => stops.forEach((stop) => stop())
  }, [])

  return (
    <div
      ref={ref}
      data-slot="table-container"
      tabIndex={scrolls ? 0 : undefined}
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("admin-table w-full caption-bottom font-text text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      // The hover lives in `.admin-table` (admin.css), only on the rows that
      // open something (`data-opens`).
      className={cn("border-b", className)}
      {...props}
    />
  )
}

/** `scope="col"` by default: the cell↔header association. Pass `scope` to override. */
function TableHead({ className, scope = "col", ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        "h-10 px-3 text-left align-bottom font-label text-xs font-normal whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2.5 align-middle [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
