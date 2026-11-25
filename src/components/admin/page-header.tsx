/**
 * Canonical backoffice page header: the title of the screen, one line of context
 * and its actions.
 *
 *   <div className="space-y-4">
 *     <PageHeader title="Candidaturas" description="…" actions={<Button …/>} />
 *     {/* toolbar + Table + TablePager *\/}
 *   </div>
 *
 * There is no "voltar" here: the way back is the menu, and the trail above the
 * screen where it is inside another one.
 *
 * Server-safe: no hooks, no handlers. Pass an already-client `actions` node
 * when the buttons need interactivity.
 */

import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** The name of the screen: its one `<h1>`. */
  title: React.ReactNode;
  /** One line of context under the title. */
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
      className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-2", className)}
    >
      <div className="min-w-0 max-w-[68ch]">
        <h1 className="text-[2rem] wrap-anywhere">{title}</h1>
        {description && (
          <p className="pt-1 font-text text-base text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
