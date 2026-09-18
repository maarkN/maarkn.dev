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
import { FUNNEL_STAGE_LABELS, isFunnelStage } from "@/lib/applications";

/** Estagios que fecham o funil — a mesma lista do MCP. */
const CLOSING_STAGES: ReadonlySet<FunnelStage> = new Set<FunnelStage>([
  "rejected",
  "withdrawn",
  "accepted",
  "ghosted",
  "no_response",
  "skipped",
]);

async function requireAdmin() {
  // Fora de try/catch: `redirect()` lanca uma excecao de controle do Next e um
  // catch aqui engoliria a navegacao (AGENTS.md §2).
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A2
}

export async function moveApplicationStage(
  id: string,
  stage: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." };
  }
  // Argumento de Server Action vem do cliente: valide como se fosse HTTP cru.
  if (typeof id !== "string" || id.length === 0 || id.length > 60) {
    return { ok: false, message: "Candidatura inválida." };
  }
  if (typeof stage !== "string" || !isFunnelStage(stage)) {
    return { ok: false, message: "Estágio inválido." };
  }

  let label = "";
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
      return { ok: false, message: "Candidatura não encontrada." };
    }
    label = current.company?.name ?? current.folderName;

    if (current.stage === stage) {
      return {
        ok: true,
        message: `“${label}” já estava em ${FUNNEL_STAGE_LABELS[stage]}.`,
      };
    }

    const occurredAt = new Date();
    const derived: { appliedAt?: Date; closedAt?: Date } = {};
    if (stage === "applied" && !current.appliedAt) derived.appliedAt = occurredAt;
    if (CLOSING_STAGES.has(stage) && !current.closedAt) {
      derived.closedAt = occurredAt;
    }

    // Uma transacao: candidatura sem evento (ou o contrario) e um buraco na
    // auditoria que nada mais no sistema consegue reconstruir.
    await db.$transaction([
      db.application.update({
        where: { id },
        data: {
          stage,
          ...derived,
          lastMcpTool: "admin:moveApplicationStage",
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
          lastMcpTool: "admin:moveApplicationStage",
        },
      }),
    ]);
  } catch (err) {
    // A action nao lanca (contrato `ActionResult`): sem este catch a UI daria
    // toast de sucesso num movimento que falhou.
    console.error("[admin] move application stage failed", err);
    return { ok: false, message: "Não foi possível mover a candidatura." };
  }

  // === invalidateQueries. O board, a lista e o dashboard leem o mesmo funil.
  revalidatePath("/admin/applications/board");
  revalidatePath("/admin/applications");
  revalidatePath("/admin");
  return {
    ok: true,
    message: `“${label}” movida para ${FUNNEL_STAGE_LABELS[stage]}.`,
  };
}
