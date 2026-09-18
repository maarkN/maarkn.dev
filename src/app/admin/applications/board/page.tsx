import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { List } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import { KanbanBoard } from "@/components/admin/kanban/kanban-board";
import { KanbanBoardSkeleton } from "@/components/admin/kanban/kanban-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import {
  applicationsQueryKey,
  hasAnyApplicationFilter,
  listApplicationMarkets,
  parseApplicationFilters,
  type ApplicationFilters,
} from "@/lib/applications-query";
import { moveApplicationStage } from "./actions";
import { BOARD_CARDS_PER_COLUMN, loadKanbanBoard } from "./board-data";
import { BoardToolbar } from "./board-toolbar";

// Guard de sessão + searchParams: esta rota nunca é pré-renderizada.
export const dynamic = "force-dynamic";

export default async function ApplicationsBoardPage({
  searchParams,
}: PageProps<"/admin/applications/board">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params = await searchParams;
  // `stage` e descartado de propósito: no board o estágio É a coluna, e filtrar
  // por um deixaria o board com uma coluna só. A lente equivalente é `phase`.
  const filters: ApplicationFilters = {
    ...parseApplicationFilters(params),
    stage: "",
  };
  const markets = await listApplicationMarkets();

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          title="Funil de candidaturas"
          description="Kanban por estágio. Mover um card grava um evento na linha do tempo da candidatura."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/applications${listQuery(filters)}`}>
                <List className="size-4" />
                Ver como lista
              </Link>
            </Button>
          }
        />

        <Card>
          <CardContent>
            <BoardToolbar
              q={filters.q}
              phase={filters.phase}
              market={filters.market}
              route={filters.route}
              sponsorship={filters.sponsorship}
              source={filters.source}
              markets={markets}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Suspense
              key={applicationsQueryKey(filters, 1)}
              fallback={<KanbanBoardSkeleton />}
            >
              <BoardColumns filters={filters} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

/* ── O board (suspenso: é o único trecho que espera o banco) ──────────────── */

async function BoardColumns({ filters }: { filters: ApplicationFilters }) {
  const data = await loadKanbanBoard(filters);

  return (
    <div className="space-y-2">
      {!data.failed && data.total > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="tabular-nums">{formatNumber(data.total)}</span>{" "}
          candidatura(s) no recorte atual · até {BOARD_CARDS_PER_COLUMN} cards
          por coluna.
        </p>
      )}
      <KanbanBoard
        data={data}
        filters={filters}
        // Referência de Server Action: serializável, então o Server Component
        // consegue entregá-la ao card (Client Component). AGENTS.md §6.
        moveAction={moveApplicationStage}
        cardsPerColumn={BOARD_CARDS_PER_COLUMN}
        dbConfigured={dbConfigured}
        filtered={hasAnyApplicationFilter(filters)}
      />
    </div>
  );
}

/** Os mesmos filtros, na URL da lista. */
function listQuery(filters: ApplicationFilters): string {
  const params = new URLSearchParams();
  for (const key of [
    "q",
    "phase",
    "market",
    "route",
    "sponsorship",
    "source",
  ] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
