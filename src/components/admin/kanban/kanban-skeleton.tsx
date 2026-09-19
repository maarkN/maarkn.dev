/**
 * Estado "carregando" do board — o equivalente de `TableLoadingRow` para o
 * Kanban (AGENTS.md §3, estado 1). Vai no `fallback` do `<Suspense>`.
 *
 * Uma linha de progresso, não quatro colunas de retângulos cinza: os blocos
 * são desenhados inteiros e revelados por um `clip-path` animado
 * (`.admin-progress` em admin.css), então sob `prefers-reduced-motion: reduce`
 * a regra global encerra a animação no último quadro — barra cheia, parada.
 */

export function KanbanBoardSkeleton() {
  return (
    <p className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
      <span aria-hidden>#</span>
      <span role="status">carregando o funil</span>
      <span className="admin-progress" aria-hidden>
        {"█".repeat(32)}
      </span>
    </p>
  );
}
