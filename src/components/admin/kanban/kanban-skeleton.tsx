/**
 * Estado "carregando" do board — o equivalente de `TableSkeletonRows` para o
 * Kanban (AGENTS.md §3, estado 1). Vai no `fallback` do `<Suspense>`.
 *
 * Desenha quatro colunas largas com tres cards cada: e o formato mediano do
 * funil e evita o salto de layout quando os dados chegam.
 */

import { Skeleton } from "@/components/ui/skeleton";

export function KanbanBoardSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-start gap-2 overflow-hidden pb-2">
      {Array.from({ length: columns }, (_, column) => (
        <div key={column} className="w-56 shrink-0 bg-muted/30">
          <Skeleton className="h-0.5 w-full" />
          <div className="flex items-center justify-between gap-2 px-2.5 py-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-5" />
          </div>
          <div className="space-y-2 px-2 pb-2">
            {Array.from({ length: 3 }, (_, card) => (
              <Skeleton key={card} className="h-24 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
