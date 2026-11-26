import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { KanbanBoard } from "@/components/admin/kanban/kanban-board";
import { PageHeader } from "@/components/admin/page-header";
import { StateMessage } from "@/components/admin/table-pager";
import { ViewSwitch } from "@/components/admin/view-switch";
import { Button } from "@/components/ui/button";
import type { AdminDictionary } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getAdminLabels } from "@/lib/admin/request";
import { clearedHref, currentHref } from "@/lib/admin/sort";
import {
  applicationsQueryKey,
  hasAnyApplicationFilter,
  listApplicationMarkets,
  listApplicationSources,
  parseApplicationFilters,
  type ApplicationFilters,
} from "@/lib/applications-query";
import { ApplicationsToolbar } from "../applications-toolbar";
import { moveApplicationStage, undoApplicationStageMove } from "./actions";
import { BOARD_CARDS_PER_COLUMN, loadBoard } from "./board-data";

// Session guard + searchParams: this route is never prerendered.
export const dynamic = "force-dynamic";

const PATH = "/admin/applications/board";

type Params = Record<string, string | string[] | undefined>;

export default async function ApplicationsBoardPage({ searchParams }: PageProps<"/admin/applications/board">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params: Params = await searchParams;
  // No `stage` here: on the board the stage is the column, and filtering by
  // one would leave a single column. The lens is the phase.
  const filters: ApplicationFilters = { ...parseApplicationFilters(params), stage: "" };
  const [markets, sources, labels] = await Promise.all([
    listApplicationMarkets(),
    listApplicationSources(),
    getAdminLabels(),
  ]);
  const { applications: words, board, vocab, common } = labels;

  const query = new URLSearchParams();
  for (const key of ["q", "phase", "market", "route", "sponsorship", "source"] as const) {
    if (filters[key]) query.set(key, filters[key]);
  }
  const listHref = `/admin/applications${query.size ? `?${query}` : ""}`;

  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      <div className="space-y-6 font-text">
        <PageHeader
          title={board.title}
          description={board.description}
          actions={
            <>
              <ViewSwitch current="board" listHref={listHref} boardHref={PATH} words={words.views} />
              <Button asChild>
                <Link href="/admin/applications/new">
                  <Plus aria-hidden="true" />
                  {words.create}
                </Link>
              </Button>
            </>
          }
        />

        <ApplicationsToolbar
          {...filters}
          mode="board"
          words={{ filters: words.filters, vocab, clear: common.states.clear }}
          markets={markets}
          sources={sources}
          page={1}
          position="top"
        />

        <Suspense
          key={applicationsQueryKey(filters, 1)}
          fallback={<StateMessage state="loading" message={board.states.loading} className="py-8" />}
        >
          <BoardColumns params={params} filters={filters} labels={labels} />
        </Suspense>
      </div>
    </AdminShell>
  );
}

/* ── The board (suspended: the only part that waits for the database) ─────── */

async function BoardColumns({
  params,
  filters,
  labels,
}: {
  params: Params;
  filters: ApplicationFilters;
  labels: AdminDictionary;
}) {
  const { board, vocab, common, applications } = labels;
  const data = await loadBoard(filters);

  if (data.failed) {
    return dbConfigured ? (
      <StateMessage
        state="failed"
        message={board.states.failed}
        action={{ href: currentHref(PATH, params), label: common.retry }}
        className="py-8"
      />
    ) : (
      <StateMessage state="failed" message={common.states.noDatabase} className="py-8" />
    );
  }
  if (data.total === 0) {
    return hasAnyApplicationFilter(filters) ? (
      <StateMessage
        state="filtered"
        message={board.states.filtered}
        action={{ href: clearedHref(PATH), label: common.states.clear }}
        className="py-8"
      />
    ) : (
      <StateMessage
        state="empty"
        message={board.states.empty}
        action={{ href: "/admin/applications/new", label: applications.create }}
        className="py-8"
      />
    );
  }

  return (
    <KanbanBoard
      data={data}
      cap={BOARD_CARDS_PER_COLUMN}
      words={{
        board,
        vocab: { stage: vocab.stage, phase: vocab.phase, column: vocab.column, closureReason: vocab.closureReason },
        priority: applications.priority,
      }}
      // References to Server Actions: serializable (AGENTS.md §6).
      moveAction={moveApplicationStage}
      undoAction={undoApplicationStageMove}
    />
  );
}
