/**
 * KPI tile used by the dashboard and by the chat usage page.
 *
 * Lives in `src/app/admin/_components/` (an underscore folder is never routed)
 * because it is dashboard chrome, not a design-system primitive: it is a thin
 * composition over `Card`. Numbers are always `tabular-nums` so a column of
 * tiles does not jitter, and the value is expected to come from
 * `formatNumber`/`formatPercent` — never from a loose `toLocaleString` (A5).
 *
 * Server-safe: no hooks, no handlers.
 */

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  /** Already formatted (`formatNumber`, `formatPercent`, …). */
  value: string;
  /** Second line: ratio, delta, last-seen date. */
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** 0–100. Renders a budget bar under the value. */
  bar?: number;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  bar,
  className,
}: StatCardProps) {
  return (
    <Card size="sm" className={className}>
      <CardContent className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {Icon ? <Icon className="size-3.5" /> : null}
          <span className="truncate text-xs">{label}</span>
        </div>
        <p className="font-display text-2xl leading-none font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {hint ? (
          <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>
        ) : null}
        {typeof bar === "number" ? (
          <div className="h-1 w-full bg-muted">
            <div
              className={cn(
                "h-1",
                bar >= 90 ? "bg-destructive" : "bg-brand",
              )}
              style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
