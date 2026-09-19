/**
 * Canonical backoffice page header.
 *
 *   <div className="space-y-4">
 *     <PageHeader title="Candidaturas" description="…" actions={<Button …/>} />
 *     <Card><CardContent>{/* Table + TablePager *\/}</CardContent></Card>
 *   </div>
 *
 * The title is NOT drawn any more: the breadcrumb of `AdminChrome` already
 * announces the screen as the command that opened it (`ls applications/`,
 * `cat applications/<folder>.md`), and a second heading right below it was the
 * same name twice. It survives as the screen's `<h1>` for assistive tech and
 * for the document outline — visually hidden, never removed. The back link
 * went the same way: `cd ..` in the chrome's footer is the way out.
 *
 * Server-safe: no hooks, no handlers. Pass an already-client `actions` node
 * when the buttons need interactivity.
 */

import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** The screen's accessible name. Rendered as a visually hidden `<h1>`. */
  title: React.ReactNode;
  /** One line of context, shown as a comment under the breadcrumb. */
  description?: React.ReactNode;
  /** Right-hand slot: buttons, dialog triggers, filters toggle. */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn("flex flex-wrap items-start justify-between gap-3", className)}
    >
      <div className="min-w-0">
        <h1 className="sr-only">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
