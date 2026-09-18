/**
 * Canonical backoffice page header (§F0.4 of the master prompt).
 *
 *   <div className="space-y-4">
 *     <PageHeader title="Candidaturas" description="…" actions={<Button …/>} />
 *     <Card><CardContent>{/* Table + TablePager *\/}</CardContent></Card>
 *   </div>
 *
 * Server-safe: no hooks, no handlers. Pass an already-client `actions` node
 * when the buttons need interactivity.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: React.ReactNode;
  /** One line of context under the title. */
  description?: React.ReactNode;
  /** Right-hand slot: buttons, dialogs triggers, filters toggle. */
  actions?: React.ReactNode;
  /** Renders a "voltar" link above the title (detail/edit pages). */
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Voltar",
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {backLabel}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
