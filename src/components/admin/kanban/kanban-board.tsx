/**
 * Board Kanban do funil de candidaturas.
 *
 * ── Como 21 estagios cabem numa tela ──────────────────────────────────────
 * O enum `funnel_stage` tem 21 valores e o prompt e explicito: 20 colunas lado
 * a lado e inutilizavel. Tres decisoes resolvem isso, nesta ordem:
 *
 *  1. **Agrupar os cinco desfechos ruins** (`rejected`, `withdrawn`,
 *     `no_response`, `ghosted`, `skipped`) numa unica coluna "Encerradas".
 *     Sao arquivo morto: o que importa e o volume, nao a posicao relativa.
 *     Cada card leva o badge do estagio exato e o cabecalho da coluna quebra a
 *     contagem por estagio, com link para a lista. `offer` e `accepted` FICAM
 *     de fora do grupo — desfecho bom merece coluna propria. 21 → 17 colunas.
 *  2. **Colapsar a coluna vazia** numa faixa de 40px com o rotulo girado
 *     (`KanbanColumn`). O estagio continua visivel na ordem do funil sem
 *     gastar 240px. Como mover e por menu, e nao por arrasto, coluna vazia
 *     nao precisa ser alvo de nada.
 *  3. **Lente por fase** (`?phase=`): escolher "Avaliacao" renderiza so as
 *     cinco colunas daquela fase. Reusa o mesmo parametro da lista, entao a
 *     URL viaja entre as duas telas.
 *
 * As colunas ficam agrupadas sob o cabecalho da fase (`FUNNEL_STAGE_PHASES`),
 * que e o mesmo agrupamento do `<Select>` da lista — o board nao inventa um
 * segundo vocabulario de funil.
 *
 * Sem `"use client"`: so o card e interativo. `moveAction` desce como
 * referencia de Server Action, que e serializavel (AGENTS.md §6).
 */

import type { FunnelStage } from "@prisma/client";
import Link from "next/link";
import type { ActionResult } from "@/app/_actions/action-result";
import { FUNNEL_PHASE_TONES } from "@/components/admin/status-badge";
import {
  FUNNEL_STAGE_LABELS,
  FUNNEL_STAGE_PHASES,
} from "@/lib/applications";
import type { ApplicationFilters } from "@/lib/applications-query";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";
import {
  CLOSED_STAGES,
  isClosedStage,
  type KanbanBoardData,
  type KanbanCardData,
} from "./kanban-types";

/* A cor da fase vem de `FUNNEL_PHASE_TONES` — a MESMA fonte que pinta o
   `[estagio]` na lista. Não há um segundo mapa de cor por fase aqui: a barra
   do painel usa `bg-current` sobre a classe `text-*` da fase. */

export interface KanbanBoardProps {
  data: KanbanBoardData;
  /** Filtros aplicados — usados para montar os links "ver na lista". */
  filters: ApplicationFilters;
  moveAction: (id: string, stage: FunnelStage) => Promise<ActionResult>;
  /** Teto de cards por coluna, para o rodape "+N nao exibida(s)". */
  cardsPerColumn: number;
  /** Sem `DATABASE_URL` a mensagem de erro e outra. */
  dbConfigured: boolean;
  /** Mostra "nenhuma corresponde aos filtros" em vez de "nenhuma registrada". */
  filtered: boolean;
}

export function KanbanBoard({
  data,
  filters,
  moveAction,
  cardsPerColumn,
  dbConfigured,
  filtered,
}: KanbanBoardProps) {
  // Estados na ordem do AGENTS.md §3 — o "carregando" e o `fallback` do
  // `<Suspense>` da pagina (`KanbanBoardSkeleton`).
  if (data.failed) {
    return (
      <BoardNotice destructive>
        {dbConfigured
          ? "Não foi possível carregar o funil."
          : "DATABASE_URL não configurada — o board fica vazio até o Postgres subir."}
      </BoardNotice>
    );
  }
  if (data.total === 0) {
    return (
      <BoardNotice>
        {filtered
          ? "Nenhuma candidatura corresponde aos filtros."
          : "Nenhuma candidatura registrada ainda."}
      </BoardNotice>
    );
  }

  const phases = filters.phase
    ? FUNNEL_STAGE_PHASES.filter((phase) => phase.key === filters.phase)
    : FUNNEL_STAGE_PHASES;

  return (
    <div className="flex items-start gap-6 overflow-x-auto pb-2">
      {phases.map((phase) => {
        const ownColumns = phase.stages.filter((stage) => !isClosedStage(stage));
        const hasClosedGroup = phase.stages.some(isClosedStage);
        const phaseTotal = phase.stages.reduce(
          (sum, stage) => sum + data.counts[stage],
          0,
        );

        return (
          <div key={phase.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2 px-0.5">
              <span
                className={cn("text-[11px] uppercase tracking-wider", FUNNEL_PHASE_TONES[phase.key])}
              >
                {phase.key}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                ({phaseTotal})
              </span>
            </div>

            <div className="flex items-start gap-2">
              {ownColumns.map((stage) => (
                <KanbanColumn
                  key={stage}
                  name={stage}
                  title={FUNNEL_STAGE_LABELS[stage]}
                  count={data.counts[stage]}
                  href={listHref(filters, stage)}
                  accentClassName={FUNNEL_PHASE_TONES[phase.key]}
                  hiddenCount={Math.max(
                    0,
                    data.counts[stage] - data.cards[stage].length,
                  )}
                >
                  {data.cards[stage].map((card) => (
                    <KanbanCard
                      key={card.id}
                      card={card}
                      moveAction={moveAction}
                    />
                  ))}
                </KanbanColumn>
              ))}

              {hasClosedGroup && (
                <ClosedColumn
                  data={data}
                  filters={filters}
                  moveAction={moveAction}
                  cardsPerColumn={cardsPerColumn}
                  accentClassName={FUNNEL_PHASE_TONES[phase.key]}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A coluna agrupada dos cinco desfechos sem sucesso. */
function ClosedColumn({
  data,
  filters,
  moveAction,
  cardsPerColumn,
  accentClassName,
}: {
  data: KanbanBoardData;
  filters: ApplicationFilters;
  moveAction: (id: string, stage: FunnelStage) => Promise<ActionResult>;
  cardsPerColumn: number;
  accentClassName: string;
}) {
  const total = CLOSED_STAGES.reduce(
    (sum, stage) => sum + data.counts[stage],
    0,
  );
  // Merge na ordem do funil: os cards ja vem ordenados dentro de cada estagio.
  const cards: KanbanCardData[] = CLOSED_STAGES.flatMap(
    (stage) => data.cards[stage],
  ).slice(0, cardsPerColumn);

  return (
    <KanbanColumn
      name="closed"
      title="Encerradas"
      count={total}
      accentClassName={accentClassName}
      hiddenCount={Math.max(0, total - cards.length)}
      breakdown={
        <p className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
          {CLOSED_STAGES.filter((stage) => data.counts[stage] > 0).map(
            (stage) => (
              /* `min-h-6` = 24px: WCAG 2.2 SC 2.5.8 (Target Size, AA). Eram
                 links de ~17.6px de altura empilhados com 2px entre as
                 linhas — não passavam nem pelo tamanho mínimo nem pela
                 exceção de espaçamento. A área cresce; o texto não. */
              <Link
                key={stage}
                href={listHref(filters, stage)}
                className="inline-flex min-h-6 items-center hover:text-foreground hover:underline"
              >
                {stage}{" "}
                <span className="tabular-nums">({data.counts[stage]})</span>
              </Link>
            ),
          )}
        </p>
      }
    >
      {cards.map((card) => (
        <KanbanCard
          key={card.id}
          card={card}
          moveAction={moveAction}
          showStage
        />
      ))}
    </KanbanColumn>
  );
}

function BoardNotice({
  children,
  destructive,
}: {
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <p
      className={
        destructive
          ? "py-10 text-destructive"
          : "py-10 text-muted-foreground"
      }
    >
      <span aria-hidden>{"# "}</span>
      {children}
    </p>
  );
}

/**
 * Link da coluna para a lista com os MESMOS filtros + o estagio. `phase` sai da
 * query porque os dois sao mutuamente exclusivos na lista (`stage` vence, mas
 * mandar os dois seria mentir sobre o que a lista vai mostrar).
 */
function listHref(filters: ApplicationFilters, stage: FunnelStage): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.market) params.set("market", filters.market);
  if (filters.route) params.set("route", filters.route);
  if (filters.sponsorship) params.set("sponsorship", filters.sponsorship);
  if (filters.source) params.set("source", filters.source);
  params.set("stage", stage);
  return `/admin/applications?${params.toString()}`;
}
