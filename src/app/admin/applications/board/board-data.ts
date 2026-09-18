import "server-only";

/**
 * Carregamento do board Kanban.
 *
 * Reusa `buildApplicationWhere` de `@/lib/applications-query` — o board NAO
 * reimplementa filtro nenhum. Isso importa mais do que parece: o filtro de
 * patrocinio e EFETIVO (candidatura sobrescreve vaga, e a vaga tem default
 * `silent`), e duplicar aquela clausula aqui faria board e lista discordarem
 * sobre quantas candidaturas existem na rota de relocacao.
 *
 * ── 1 groupBy + 1 consulta por estagio NAO VAZIO ──────────────────────────
 * O fan-out e limitado pelo numero de estagios do funil (21), nao pelo volume
 * de dados — com a base cheia sao ~66 statements por render, medidos em 198ms
 * contra 127ms da lista. Se isso virar problema, o fix e SQL cru com
 * ROW_NUMBER() OVER (PARTITION BY stage), reimplementando buildApplicationWhere
 * em SQL; hoje nao compensa a regressao.
 *
 * 1. Um `groupBy` traz a contagem REAL de cada estagio. E ela que aparece no
 *    cabecalho da coluna: contar `cards.length` mentiria assim que uma coluna
 *    passasse do teto.
 * 2. So os estagios com contagem > 0 vao buscar cards, em paralelo, com
 *    `take: BOARD_CARDS_PER_COLUMN`. Coluna vazia nao gera consulta — e na
 *    base atual a maioria esta vazia. O alternativo (um `findMany` global com
 *    teto) tem um modo de falha feio: ordenado por estagio, o `radar` sozinho
 *    consumiria o teto e as colunas seguintes viriam vazias com contagem
 *    positiva.
 */

import type { Prisma } from "@prisma/client";
import { db, dbConfigured } from "@/lib/db";
import { FUNNEL_STAGES } from "@/lib/applications";
import {
  buildApplicationWhere,
  type ApplicationFilters,
} from "@/lib/applications-query";
import {
  emptyKanbanBoard,
  stageRecord,
  type KanbanBoardData,
  type KanbanCardData,
} from "@/components/admin/kanban/kanban-types";

/**
 * Teto de cards por coluna. O que passa disso vira "+N nao exibida(s)" com
 * link para a lista — que e paginada e existe justamente para o volume.
 */
export const BOARD_CARDS_PER_COLUMN = 25;

/**
 * Espelha `KanbanCardData`. Nao ha `as` nenhum na atribuicao la embaixo
 * (`cards[stage] = lists[index]`), entao o TypeScript quebra o build se este
 * `select` sair de sincronia com o tipo do card.
 */
const CARD_SELECT = {
  id: true,
  folderName: true,
  stage: true,
  roleTitle: true,
  market: true,
  sponsorship: true,
  priority: true,
  company: { select: { name: true } },
  job: {
    select: {
      title: true,
      market: true,
      sponsorship: true,
      locationText: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

export async function loadKanbanBoard(
  filters: ApplicationFilters,
): Promise<KanbanBoardData> {
  // A3: `next build` roda sem DATABASE_URL — degrade, nunca lance.
  if (!dbConfigured) return emptyKanbanBoard(true);

  const where = buildApplicationWhere(filters);
  try {
    const grouped = await db.application.groupBy({
      by: ["stage"],
      where,
      _count: { _all: true },
    });

    const counts = stageRecord(() => 0);
    let total = 0;
    for (const row of grouped) {
      counts[row.stage] = row._count._all;
      total += row._count._all;
    }

    const populated = FUNNEL_STAGES.filter((stage) => counts[stage] > 0);
    const lists = await Promise.all(
      populated.map((stage) =>
        db.application.findMany({
          where: { AND: [where, { stage }] },
          select: CARD_SELECT,
          // Mesma ordenacao da lista, menos o `stage` (a coluna JA e o estagio).
          orderBy: [
            { priority: { sort: "asc", nulls: "last" } },
            { updatedAt: "desc" },
          ],
          take: BOARD_CARDS_PER_COLUMN,
        }),
      ),
    );

    const cards = stageRecord<KanbanCardData[]>(() => []);
    populated.forEach((stage, index) => {
      cards[stage] = lists[index];
    });

    return { counts, cards, total, failed: false };
  } catch (err) {
    console.error("[admin] load applications board failed", err);
    return emptyKanbanBoard(true);
  }
}
