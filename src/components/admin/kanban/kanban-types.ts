/**
 * Vocabulario do board Kanban de candidaturas.
 *
 * Este modulo e **client-safe** de proposito: o card e a coluna sao renderizados
 * no cliente (menu "mover para" + transition) e o carregador de dados
 * (`src/app/admin/applications/board/board-data.ts`) e `server-only`. O tipo do
 * card vive aqui, no meio, para que os dois lados nao dependam um do outro —
 * o `select` do Prisma e conferido contra `KanbanCardData` na compilacao.
 *
 * O import de `@prisma/client` e `import type` pelo mesmo motivo de
 * `@/lib/applications`: tipo e apagado na compilacao, o runtime do Prisma nunca
 * chega ao bundle do navegador.
 */

import type { FunnelStage, SponsorshipSignal } from "@prisma/client";
import { FUNNEL_STAGES } from "@/lib/applications";

/** Payload minimo do cartao. Nada de markdown longo: o board e uma visao densa. */
export type KanbanCardData = {
  id: string;
  folderName: string;
  stage: FunnelStage;
  roleTitle: string | null;
  market: string | null;
  /** `null` = herda o sinal da vaga (ver `effectiveSponsorship`). */
  sponsorship: SponsorshipSignal | null;
  priority: number | null;
  company: { name: string } | null;
  job: {
    title: string;
    market: string | null;
    sponsorship: SponsorshipSignal;
    locationText: string | null;
  } | null;
};

/**
 * Os cinco desfechos SEM sucesso. Ganham UMA coluna agrupada ("Encerradas") em
 * vez de cinco colunas proprias: sao arquivo morto do funil, cada card ja
 * carrega o badge do estagio exato e o cabecalho da coluna quebra a contagem
 * por estagio. `offer` e `accepted` NAO entram aqui — desfecho bom merece
 * coluna propria, e sao justamente as duas que se quer ver de longe.
 */
export const CLOSED_STAGES = [
  "rejected",
  "withdrawn",
  "no_response",
  "ghosted",
  "skipped",
] as const satisfies readonly FunnelStage[];

const CLOSED_STAGE_SET: ReadonlySet<FunnelStage> = new Set(CLOSED_STAGES);

export function isClosedStage(stage: FunnelStage): boolean {
  return CLOSED_STAGE_SET.has(stage);
}

/** O que o board precisa do banco: contagem exata por estagio + os cards. */
export type KanbanBoardData = {
  /** Contagem REAL por estagio (vem de um `groupBy`, nao do tamanho da lista). */
  counts: Record<FunnelStage, number>;
  /** Cards ja limitados a `BOARD_CARDS_PER_COLUMN` por estagio. */
  cards: Record<FunnelStage, KanbanCardData[]>;
  total: number;
  /** `true` quando a consulta falhou ou nao ha `DATABASE_URL` (regra A3). */
  failed: boolean;
};

/** `Record<FunnelStage, T>` com todos os 21 estagios preenchidos. */
export function stageRecord<T>(make: () => T): Record<FunnelStage, T> {
  return Object.fromEntries(
    FUNNEL_STAGES.map((stage) => [stage, make()]),
  ) as Record<FunnelStage, T>;
}

export function emptyKanbanBoard(failed: boolean): KanbanBoardData {
  return {
    counts: stageRecord(() => 0),
    cards: stageRecord<KanbanCardData[]>(() => []),
    total: 0,
    failed,
  };
}
