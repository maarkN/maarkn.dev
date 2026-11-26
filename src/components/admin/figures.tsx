/**
 * Numbers of a screen, without a box (docs/design/backoffice.md): content, so
 * solid, each with its name above and, when it needs one, a line of context.
 * A description list, so a screen reader hears the name with the number.
 * Server-safe.
 */

import { cn } from "@/lib/utils";

export type Figure = {
  label: string;
  /** Already written for the reader (`formatNumber`, `formatPercent`). */
  value: string;
  hint?: string;
  /** 0 to 100: a bar under the number, for a share of a limit. */
  share?: number;
};

export function Figures({ label, items, className }: { label: string; items: Figure[]; className?: string }) {
  return (
    <dl aria-label={label} className={cn("grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 xl:grid-cols-6", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <dt className="truncate text-sm text-muted-foreground">{item.label}</dt>
          <dd className="font-text text-3xl leading-none font-[640] tabular-nums">{item.value}</dd>
          {item.hint && <dd className="text-sm text-muted-foreground">{item.hint}</dd>}
          {typeof item.share === "number" && (
            <dd aria-hidden="true" className="h-1 w-full bg-muted">
              <div
                className={cn("h-1", item.share >= 90 ? "bg-destructive" : "bg-primary")}
                style={{ width: `${Math.min(100, Math.max(0, item.share))}%` }}
              />
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
