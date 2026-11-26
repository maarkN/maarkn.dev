"use server";

/**
 * Mover uma candidatura de estagio pelo board.
 *
 * Espelha o `applyStageChange` do MCP (`src/lib/mcp/tools/applications.ts`) —
 * de proposito, e este e o ponto do arquivo:
 *
 * - a mudanca de estagio SEMPRE grava um `ApplicationEvent`
 *   `type = "stage_change"` com `fromStage`/`toStage`. A linha do tempo da
 *   candidatura precisa registrar tanto o que o agente moveu quanto o que eu
 *   movi na mao, senao a metrica de conversao nasce torta;
 * - as metricas derivadas (`appliedAt`, `closedAt`) sao preenchidas UMA vez, e
 *   so quando ainda estao vazias — mover para "Enviada" carimba a data de
 *   envio; mover para um desfecho carimba o fechamento; voltar atras nao apaga
 *   nem sobrescreve o carimbo original;
 * - mover para o estagio em que a candidatura JA esta e no-op: nem `update`,
 *   nem evento. E o que impede o board de encher a linha do tempo de
 *   "stage_change" identicos num duplo clique.
 *
 * "Desfazer" no aviso NAO e outro movimento: e `undoApplicationStageMove`,
 * abaixo, que recebe o evento que o movimento gravou e desfaz o movimento
 * inteiro, a data que ele carimbou inclusive. Um movimento de volta comum
 * deixaria a candidatura "pronta" com data de envio.
 *
 * Diferenca deliberada em relacao ao MCP: aqui o evento nasce com `sourceKey`
 * nulo. `sourceKey` e UNIQUE e existe para o upsert idempotente da
 * sincronizacao; um movimento manual nao tem chave natural no vault, e inventar
 * uma (`folder#stage#a->b@data`) faria dois movimentos no mesmo dia colidirem
 * com o evento gravado pela skill.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FunnelStage } from "@prisma/client";
import type { ActionResult } from "@/app/_actions/action-result";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { safeDbError } from "@/lib/safe-error";
import type { StageMove } from "@/components/admin/kanban/kanban-types";
import { isFunnelStage } from "@/lib/applications";
import { getAdminLabels } from "@/lib/admin/request";
import { fill } from "@/lib/admin/text";

/** Estagios que fecham o funil — a mesma lista do MCP. */
const CLOSING_STAGES: ReadonlySet<FunnelStage> = new Set<FunnelStage>([
  "rejected",
  "withdrawn",
  "accepted",
  "ghosted",
  "no_response",
  "skipped",
]);

/** Quem gravou: o movimento e o desfazer deixam rastros diferentes. */
const TOOL = { move: "admin:moveApplicationStage", undo: "admin:undoApplicationStageMove" } as const;

/** Argumento de Server Action vem do cliente: valide como se fosse HTTP cru. */
const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 60;

async function requireAdmin() {
  // Fora de try/catch: `redirect()` lanca uma excecao de controle do Next e um
  // catch aqui engoliria a navegacao (AGENTS.md §2).
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A2
}

export async function moveApplicationStage(
  id: string,
  stage: string,
): Promise<ActionResult<StageMove>> {
  await requireAdmin();
  // The messages go to a notice of a translated screen: its language (A4).
  const { moves, vocab, common } = await getAdminLabels();
  if (!dbConfigured) {
    return { ok: false, message: common.noDatabase };
  }
  if (!isId(id)) {
    return { ok: false, message: moves.missing };
  }
  if (typeof stage !== "string" || !isFunnelStage(stage)) {
    return { ok: false, message: moves.badStage };
  }

  let label = "";
  let eventId = "";
  try {
    const current = await db.application.findUnique({
      where: { id },
      select: {
        stage: true,
        appliedAt: true,
        closedAt: true,
        folderName: true,
        company: { select: { name: true } },
      },
    });
    if (!current) {
      return { ok: false, message: moves.missing };
    }
    label = current.company?.name ?? current.folderName;

    if (current.stage === stage) {
      return { ok: true, message: fill(moves.already, { name: label, stage: vocab.stage[stage] }) };
    }

    const occurredAt = new Date();
    const derived: { appliedAt?: Date; closedAt?: Date } = {};
    if (stage === "applied" && !current.appliedAt) derived.appliedAt = occurredAt;
    if (CLOSING_STAGES.has(stage) && !current.closedAt) {
      derived.closedAt = occurredAt;
    }

    // Uma transacao: candidatura sem evento (ou o contrario) e um buraco na
    // auditoria que nada mais no sistema consegue reconstruir.
    const [, event] = await db.$transaction([
      db.application.update({
        where: { id },
        data: {
          stage,
          ...derived,
          lastMcpTool: TOOL.move,
        },
      }),
      db.applicationEvent.create({
        data: {
          applicationId: id,
          occurredAt,
          type: "stage_change",
          fromStage: current.stage,
          toStage: stage,
          subject: `${current.stage} -> ${stage}`,
          lastMcpTool: TOOL.move,
        },
        select: { id: true },
      }),
    ]);
    eventId = event.id;
  } catch (err) {
    // A action nao lanca (contrato `ActionResult`): sem este catch a UI daria
    // toast de sucesso num movimento que falhou.
    console.error("[admin] move application stage failed", safeDbError(err));
    return { ok: false, message: moves.failed };
  }

  revalidateFunnel();
  return { ok: true, data: { eventId }, message: fill(moves.moved, { name: label, stage: vocab.stage[stage] }) };
}

/**
 * "Desfazer" no aviso de um movimento do board: a candidatura volta ao estagio
 * que o movimento encontrou, e o que ele carimbou sai junto.
 *
 * O movimento carimba `appliedAt`/`closedAt` com o instante do proprio evento
 * (`occurredAt`), e so quando estavam vazios. Uma data que e EXATAMENTE esse
 * instante foi, portanto, carimbada por ele, e volta a ficar vazia; qualquer
 * outra ja estava la antes, ou foi escrita por outra mao depois, e fica.
 * (Esse sinal depende do carimbo ser o instante do evento, como no MCP; a
 * meia-noite UTC que o A5 pede para `appliedAt` mudaria os dois juntos.)
 *
 * Desfazer tambem e mudanca de estagio: grava o seu `ApplicationEvent`, e o
 * evento do movimento fica. A linha do tempo diz que ela foi e voltou.
 *
 * So vale enquanto a candidatura esta onde o movimento a deixou. Se mudou
 * depois (pelo dossie, pelo MCP), desfazer nao passa por cima disso.
 */
export async function undoApplicationStageMove(
  id: string,
  eventId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const { moves, vocab, common } = await getAdminLabels();
  if (!dbConfigured) {
    return { ok: false, message: common.noDatabase };
  }
  if (!isId(id) || !isId(eventId)) {
    return { ok: false, message: moves.missing };
  }

  let label = "";
  let back: FunnelStage;
  try {
    const [current, move] = await Promise.all([
      db.application.findUnique({
        where: { id },
        select: {
          stage: true,
          appliedAt: true,
          closedAt: true,
          folderName: true,
          company: { select: { name: true } },
        },
      }),
      db.applicationEvent.findFirst({
        where: { id: eventId, applicationId: id, type: "stage_change", lastMcpTool: TOOL.move },
        select: { fromStage: true, toStage: true, occurredAt: true },
      }),
    ]);
    if (!current || !move?.fromStage || !move.toStage) {
      return { ok: false, message: moves.missing };
    }
    label = current.company?.name ?? current.folderName;
    back = move.fromStage;

    // Desfeito ja (um segundo clique, um "Tentar de novo" que chegou depois).
    if (current.stage === back) {
      return { ok: true, message: fill(moves.already, { name: label, stage: vocab.stage[back] }) };
    }
    if (current.stage !== move.toStage) {
      return { ok: false, message: fill(moves.changed, { name: label, stage: vocab.stage[current.stage] }) };
    }

    const stamp = move.occurredAt.getTime();
    const cleared: { appliedAt?: null; closedAt?: null } = {};
    if (current.appliedAt?.getTime() === stamp) cleared.appliedAt = null;
    if (current.closedAt?.getTime() === stamp) cleared.closedAt = null;

    await db.$transaction([
      db.application.update({
        where: { id },
        data: { stage: back, ...cleared, lastMcpTool: TOOL.undo },
      }),
      db.applicationEvent.create({
        data: {
          applicationId: id,
          occurredAt: new Date(),
          type: "stage_change",
          fromStage: move.toStage,
          toStage: back,
          subject: `${move.toStage} -> ${back}`,
          lastMcpTool: TOOL.undo,
        },
      }),
    ]);
  } catch (err) {
    console.error("[admin] undo application stage move failed", safeDbError(err));
    return { ok: false, message: moves.failed };
  }

  revalidateFunnel();
  return { ok: true, message: fill(moves.moved, { name: label, stage: vocab.stage[back] }) };
}

/** === invalidateQueries. O board, a lista e o dashboard leem o mesmo funil. */
function revalidateFunnel() {
  revalidatePath("/admin/applications/board");
  revalidatePath("/admin/applications");
  revalidatePath("/admin");
}
