"use client"

import * as React from "react"

import { observeSize } from "@/components/holo/size-observer"
import { cn } from "@/lib/utils"

/**
 * `admin-listing` (src/app/admin/admin.css) is what turns this into `ls`
 * output: `table-layout: fixed`, widths in `ch`, tabular numerals, the
 * comment-coloured header and the terminal-selection row highlight. It is
 * applied here, once, instead of at eight call sites — the DOM is untouched,
 * which is the whole point of the decision recorded in the bko-03 design.md.
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
        className={cn("admin-listing w-full caption-bottom text-xs", className)}
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
      // The hover highlight lives in `.admin-listing` (admin.css), which also
      // lifts the row's text to --foreground so no cell colour has to be measured
      // on --accent. `hover:bg-transparent` is the opt-out for non-data rows.
      className={cn(
        "border-b transition-colors has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

/** `scope="col"` by default: it is what makes the cell↔header association
 * survive the `ls` paint. Pass `scope` explicitly to override. */
function TableHead({ className, scope = "col", ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
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
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
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
      className={cn("mt-4 text-xs text-muted-foreground", className)}
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
