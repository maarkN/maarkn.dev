import "server-only";
import type { FunnelStage, InterviewStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import {
  acceptsClosureReason,
  closureReasonLabel,
  closureReasonOnStageChange,
  closureReasonRemovedNote,
  CLOSURE_REASON_STAGES,
} from "@/lib/applications";
import { db } from "@/lib/db";
import { resolveInterviewState } from "@/lib/interviews";
import {
  defineMcpTool,
  jsonResult,
  McpToolError,
  type McpToolContext,
} from "@/lib/mcp/tool";
import { safeErrorMessage } from "@/lib/mcp/redact";
import {
  LIMITS,
  bumpSyncRun,
  normalizePath,
  pathSchema,
  requireDb,
  sha256Schema,
  syncRunIdSchema,
  textSchema,
  type Scalars,
} from "@/lib/mcp/tools/_common";

/**
 * Tools de sincronizacao.
 *
 * `check_sync_state` e o coracao da economia pedida no briefing: a skill
 * calcula o sha256 LOCALMENTE, pergunta o que mudou, e so entao le e envia o
 * corpo dos arquivos alterados. Numa segunda rodada sem alteracao no vault
 * nenhum byte de conteudo trafega e nenhum embedding e gasto.
 *
 * As outras tres existem porque o F1 exige que "desfazer a ultima sync" seja
 * uma operacao real: `open_sync_run` abre a rodada, os `upsert_*` penduram
 * `Provenance` nela, `close_sync_run` fecha e `revert_sync_run` reaplica os
 * `before` na ordem inversa.
 */

// --------------------------------------------------------------------------
// check_sync_state
// --------------------------------------------------------------------------

const fileEntrySchema = z.object({
  path: pathSchema.describe("Caminho relativo dentro do vault, como aparece no disco."),
  sha256: sha256Schema.describe("sha256 do conteudo do arquivo, calculado na maquina do usuario."),
  sizeBytes: z.number().int().min(0).max(1_000_000_000).optional(),
});

export const checkSyncState = defineMcpTool({
  name: "check_sync_state",
  title: "Descobrir quais arquivos do vault mudaram",
  description:
    "Compara uma lista de {path, sha256} com o estado guardado no servidor e responde quais arquivos sao NOVOS, quais foram ALTERADOS e quais estao INALTERADOS. " +
    "Chame SEMPRE isto antes de ler ou enviar o corpo de qualquer arquivo: os arquivos que voltarem como 'inalterado' nao devem ser lidos nem enviados — e essa a economia de banda, de tokens e de embedding do desenho. " +
    "O campo 'enviar' ja vem pronto com os caminhos que precisam de conteudo. " +
    "Opcionalmente, 'pathPrefix' faz a tool listar tambem os arquivos que o servidor conhece sob aquele prefixo e que NAO vieram na lista (candidatos a arquivo apagado no vault) — a tool nunca apaga nada sozinha. " +
    "Esta tool nao grava conteudo: quem atualiza o sha256 do arquivo e o upsert_* que recebe o bloco 'source'.",
  scopes: ["sync:read"],
  inputSchema: {
    files: z
      .array(fileEntrySchema)
      .min(1)
      .max(LIMITS.batch)
      .describe(`Ate ${LIMITS.batch} arquivos por chamada. Divida em lotes se o vault for maior.`),
    syncRunId: syncRunIdSchema
      .optional()
      .describe("Rodada aberta por open_sync_run, para contabilizar filesSeen."),
    pathPrefix: pathSchema
      .optional()
      .describe("Ex.: '04 - Candidaturas/'. Ativa o relatorio de arquivos ausentes."),
  },
  outputSchema: {
    resumo: z.object({
      total: z.number(),
      novos: z.number(),
      alterados: z.number(),
      inalterados: z.number(),
      ausentes: z.number(),
    }),
    enviar: z.array(z.string()),
    arquivos: z.array(
      z.object({
        path: z.string(),
        status: z.enum(["novo", "alterado", "inalterado"]),
        chunkCount: z.number(),
        embeddedAt: z.string().nullable(),
        entityType: z.string().nullable(),
        entityId: z.string().nullable(),
      })
    ),
    ausentes: z.array(z.string()),
    duplicados: z.array(z.string()),
    instrucao: z.string(),
    contexto: z.object({
      syncRunId: z.string().nullable(),
      auditId: z.string().nullable(),
    }),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  async handler(args, ctx) {
    requireDb();

    // Normaliza (NFC) e deduplica dentro do proprio lote: o macOS entrega NFD e
    // um lote com o mesmo arquivo duas vezes so gastaria trabalho.
    const seen = new Map<string, { sha256: string; sizeBytes?: number }>();
    const duplicados: string[] = [];
    for (const file of args.files) {
      const path = normalizePath(file.path);
      if (seen.has(path)) duplicados.push(path);
      seen.set(path, { sha256: file.sha256.toLowerCase(), sizeBytes: file.sizeBytes });
    }
    const paths = [...seen.keys()];

    const known = await db.syncState.findMany({
      where: { sourcePath: { in: paths } },
      select: {
        sourcePath: true,
        contentSha256: true,
        chunkCount: true,
        embeddedAt: true,
        entityType: true,
        entityId: true,
      },
    });
    const byPath = new Map(known.map((row) => [row.sourcePath, row]));

    const arquivos = paths.map((path) => {
      const row = byPath.get(path);
      const sha = seen.get(path)!.sha256;
      const status = !row
        ? ("novo" as const)
        : row.contentSha256.toLowerCase() === sha
          ? ("inalterado" as const)
          : ("alterado" as const);
      return {
        path,
        status,
        chunkCount: row?.chunkCount ?? 0,
        embeddedAt: row?.embeddedAt ? row.embeddedAt.toISOString() : null,
        entityType: row?.entityType ?? null,
        entityId: row?.entityId ?? null,
      };
    });

    const enviar = arquivos.filter((f) => f.status !== "inalterado").map((f) => f.path);

    // Presenca: `lastSeenAt` e o que permite detectar arquivo sumido do vault
    // mais tarde. Nao tocamos em contentSha256 aqui — o sha so avanca quando o
    // conteudo e de fato gravado por um upsert_*.
    if (known.length > 0) {
      try {
        await db.syncState.updateMany({
          where: { sourcePath: { in: known.map((row) => row.sourcePath) } },
          data: {
            lastSeenAt: new Date(),
            ...(args.syncRunId ? { lastSyncRunId: args.syncRunId } : {}),
          },
        });
      } catch (err) {
        console.error("[mcp] check_sync_state: falha ao marcar presenca:", safeErrorMessage(err));
      }
    }

    let ausentes: string[] = [];
    if (args.pathPrefix) {
      const prefix = normalizePath(args.pathPrefix, "pathPrefix");
      const rows = await db.syncState.findMany({
        where: { sourcePath: { startsWith: prefix }, NOT: { sourcePath: { in: paths } } },
        select: { sourcePath: true },
        take: LIMITS.batch,
        orderBy: { sourcePath: "asc" },
      });
      ausentes = rows.map((row) => row.sourcePath);
    }

    await bumpSyncRun(args.syncRunId, { filesSeen: paths.length, toolCalls: 1 });

    return jsonResult({
      resumo: {
        total: paths.length,
        novos: arquivos.filter((f) => f.status === "novo").length,
        alterados: arquivos.filter((f) => f.status === "alterado").length,
        inalterados: arquivos.filter((f) => f.status === "inalterado").length,
        ausentes: ausentes.length,
      },
      enviar,
      arquivos,
      ausentes,
      duplicados,
      instrucao:
        "Leia e envie apenas os caminhos de 'enviar'. Ao chamar um upsert_*, repasse o bloco " +
        "'source' com { path, sha256 } — e o que faz este arquivo virar 'inalterado' na proxima rodada. " +
        "'ausentes' e apenas um relatorio: nada e apagado pelo MCP.",
      contexto: { syncRunId: args.syncRunId ?? null, auditId: ctx.auditId },
    });
  },
});

// --------------------------------------------------------------------------
// open_sync_run / close_sync_run
// --------------------------------------------------------------------------

export const openSyncRun = defineMcpTool({
  name: "open_sync_run",
  title: "Abrir uma rodada de sincronizacao",
  description:
    "Abre um SyncRun e devolve o 'syncRunId' que deve ser repassado a TODAS as chamadas seguintes da mesma rodada. " +
    "E o que agrupa a proveniencia e torna 'revert_sync_run' possivel — sem rodada aberta, cada escrita fica avulsa e nao ha como desfazer o lote. " +
    "Para retomar uma sincronizacao interrompida, chame com resume=true: se ja houver uma rodada 'running' desta chave, ela e devolvida em vez de uma nova ser criada.",
  scopes: ["sync:write"],
  inputSchema: {
    note: textSchema.optional().describe("Rotulo humano da rodada (ex.: 'sync completa do vault')."),
    resume: z
      .boolean()
      .default(false)
      .describe("true = reaproveita a rodada 'running' mais recente desta chave, se existir."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  async handler(args, ctx) {
    requireDb();

    if (args.resume) {
      const open = await db.syncRun.findFirst({
        where: { status: "running", apiKeyId: ctx.apiKeyId },
        orderBy: { startedAt: "desc" },
        select: { id: true, startedAt: true, filesSeen: true, entitiesWritten: true },
      });
      if (open) {
        return jsonResult({
          syncRunId: open.id,
          retomada: true,
          abertaEm: open.startedAt.toISOString(),
          filesSeen: open.filesSeen,
          entitiesWritten: open.entitiesWritten,
        });
      }
    }

    const run = await db.syncRun.create({
      data: {
        status: "running",
        apiKeyId: ctx.apiKeyId,
        note: args.note ?? null,
      },
      select: { id: true, startedAt: true },
    });

    const abandonadas = await db.syncRun.count({
      where: { status: "running", apiKeyId: ctx.apiKeyId, NOT: { id: run.id } },
    });

    return jsonResult({
      syncRunId: run.id,
      retomada: false,
      abertaEm: run.startedAt.toISOString(),
      outrasRodadasAbertas: abandonadas,
      instrucao:
        "Passe este syncRunId em todas as tools desta rodada e feche com close_sync_run ao terminar.",
    });
  },
});

export const closeSyncRun = defineMcpTool({
  name: "close_sync_run",
  title: "Fechar uma rodada de sincronizacao",
  description:
    "Fecha o SyncRun com status 'ok' ou 'failed' e devolve os contadores finais (filesSeen, filesSent, entitiesWritten, failures). " +
    "Use no fim da sincronizacao, mesmo quando houve falha — uma rodada que fica 'running' para sempre e ruido na auditoria. " +
    "Os contadores enviados aqui SOMAM aos que as tools ja acumularam.",
  scopes: ["sync:write"],
  inputSchema: {
    syncRunId: syncRunIdSchema,
    status: z.enum(["ok", "failed"]).default("ok"),
    note: textSchema.optional(),
    filesSent: z.number().int().min(0).max(100_000).optional(),
    failures: z.number().int().min(0).max(100_000).optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  async handler(args, ctx) {
    requireDb();
    const run = await db.syncRun.findUnique({
      where: { id: args.syncRunId },
      select: { id: true, status: true, apiKeyId: true },
    });
    if (!run) throw new McpToolError("syncRunId desconhecido.", "invalid_arguments");
    if (run.apiKeyId && run.apiKeyId !== ctx.apiKeyId) {
      throw new McpToolError(
        "Esta rodada de sincronizacao pertence a outra chave de API.",
        "invalid_arguments"
      );
    }
    if (run.status !== "running") {
      throw new McpToolError(
        `A rodada ja esta '${run.status}'. Uma rodada fechada nao reabre.`,
        "invalid_arguments"
      );
    }

    await bumpSyncRun(args.syncRunId, {
      filesSent: args.filesSent,
      failures: args.failures,
      toolCalls: 1,
    });

    const closed = await db.syncRun.update({
      where: { id: args.syncRunId },
      data: {
        status: args.status,
        finishedAt: new Date(),
        ...(args.note ? { note: args.note } : {}),
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        filesSeen: true,
        filesSent: true,
        entitiesWritten: true,
        failures: true,
        toolCalls: true,
      },
    });

    const provenances = await db.provenance.count({ where: { syncRunId: closed.id } });

    return jsonResult({
      ...closed,
      startedAt: closed.startedAt.toISOString(),
      finishedAt: closed.finishedAt ? closed.finishedAt.toISOString() : null,
      fatosGravados: provenances,
      instrucao:
        "Relatorio da rodada. Para desfazer tudo o que ela escreveu, use revert_sync_run com este mesmo id.",
    });
  },
});

// --------------------------------------------------------------------------
// revert_sync_run
// --------------------------------------------------------------------------

/**
 * Delegates que o rollback sabe reverter. So entram entidades que alguma tool
 * de F3b escreve — reverter algo que ninguem grava seria codigo morto com
 * poder de DELETE, e este repositorio e publico.
 *
 * O nome do modelo, e nao o delegate: o delegate e lido de `db` na hora de
 * reverter, como em qualquer outra tool.
 */
type ScalarDelegate = {
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
};

const REVERTERS: Record<string, string> = {
  Company: "company",
  Job: "job",
  JobTech: "jobTech",
  Application: "application",
  ApplicationEvent: "applicationEvent",
  Document: "document",
  Contact: "contact",
  ChecklistItem: "checklistItem",
  ScreeningQuestion: "screeningQuestion",
  RequirementCoverage: "requirementCoverage",
  HonestyNote: "honestyNote",
  Interview: "interview",
  Experience: "experience",
  CareerProject: "careerProject",
  ResumeBullet: "resumeBullet",
  Skill: "skill",
  GeneratedResume: "generatedResume",
};

function reverterFor(entityType: string): ScalarDelegate | undefined {
  const model = REVERTERS[entityType];
  return model ? (db as unknown as Record<string, ScalarDelegate>)[model] : undefined;
}

/**
 * Campos que o rollback NUNCA reaplica. `visibility` esta aqui porque promover
 * conteudo para publico e decisao humana na UI: se um humano publicou algo
 * depois da rodada, desfazer a rodada nao pode despublicar (nem publicar) nada.
 */
const NEVER_REVERT = new Set(["id", "visibility", "createdAt", "updatedAt"]);

/**
 * O que a reversao de UM fato escreve.
 *
 * O `before` guarda so os campos que a rodada mudou. Reaplicado cru sobre uma
 * linha que mudou depois da rodada, ele monta uma linha que as regras do
 * dossie recusam (e os CHECKs da migracao `dossier_fields` tambem): uma
 * candidatura aberta com o motivo de encerramento gravado depois, ou uma
 * entrevista prevista com a data restaurada. A reversao passa pelas mesmas
 * regras de quem escreve esses campos.
 */
type RestorePlan = {
  data: Scalars;
  /** O que foi escrito alem do `before`, e por que. */
  ajustes: string[];
  /** O que do `before` nao voltou, e por que. */
  recusas: string[];
  /** Evento de linha do tempo gravado na mesma transacao do update. */
  evento?: Prisma.ApplicationEventUncheckedCreateInput;
};

async function planRestore(
  entityType: string,
  entityId: string,
  data: Scalars,
  ctx: McpToolContext,
  syncRunId: string
): Promise<RestorePlan> {
  const plan: RestorePlan = { data, ajustes: [], recusas: [] };
  if (entityType === "Application") {
    if (!("stage" in data) && !("closureReason" in data)) return plan;
    const current = await db.application.findUnique({
      where: { id: entityId },
      select: { stage: true, closureReason: true },
    });
    if (!current) return plan; // o update relata que a linha sumiu
    const stage = (data.stage ?? current.stage) as FunnelStage;

    if ("closureReason" in data) {
      // A rodada mudou o motivo. Ele so volta onde motivo existe.
      if (data.closureReason && !acceptsClosureReason(stage)) {
        plan.recusas.push(
          `Motivo de encerramento '${closureReasonLabel(data.closureReason as never)}' nao restaurado: a candidatura esta em '${stage}', e motivo so existe em ${CLOSURE_REASON_STAGES.join(" ou ")}.`
        );
        delete data.closureReason;
      }
      return plan;
    }

    // A rodada mudou so o estagio: voltar a um estagio aberto remove o motivo
    // gravado depois dela, como em toda mudanca de estagio, e registra qual.
    const closure = closureReasonOnStageChange(stage, current.closureReason);
    if (closure.removed) {
      Object.assign(data, closure.patch);
      plan.ajustes.push(
        `${closureReasonRemovedNote(closure.removed)} Foi gravado depois da rodada, e a candidatura voltou a '${stage}'.`
      );
      plan.evento = {
        applicationId: entityId,
        type: "stage_change",
        fromStage: current.stage,
        toStage: stage,
        subject: `${current.stage} -> ${stage}`,
        bodyMd: `${closureReasonRemovedNote(closure.removed)}\n\nReversao da rodada ${syncRunId}.`,
        lastMcpTool: ctx.tool,
        lastApiKeyId: ctx.apiKeyId,
      };
    }
    return plan;
  }

  if (entityType === "Interview") {
    if (!("status" in data) && !("scheduledAt" in data)) return plan;
    const current = await db.interview.findUnique({
      where: { id: entityId },
      select: { status: true, scheduledAt: true },
    });
    if (!current) return plan;
    const state = resolveInterviewState(current, {
      status: "status" in data ? (data.status as InterviewStatus) : undefined,
      scheduledAt:
        "scheduledAt" in data
          ? data.scheduledAt === null
            ? null
            : new Date(data.scheduledAt as string)
          : undefined,
    });
    if (!state.ok) {
      plan.recusas.push(`Situacao e data nao restauradas: ${state.message}`);
      delete data.status;
      delete data.scheduledAt;
      return plan;
    }
    if (!("status" in data) && state.status !== current.status) {
      plan.ajustes.push(
        `Situacao ${current.status} -> ${state.status}: a data restaurada decide entre prevista e marcada.`
      );
    }
    data.status = state.status;
    data.scheduledAt = state.scheduledAt;
  }
  return plan;
}

/**
 * Mensagem de uma falha da reversao. Um CHECK recusado diz qual e por que,
 * sem o texto cru do Prisma, que comeca pelo caminho do arquivo e termina com
 * a linha inteira (notas, contatos) recusada.
 */
export function revertFailureMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const check = /violates check constraint \\?"([A-Za-z0-9_]+)/.exec(raw)?.[1];
  if (check) {
    return `Recusado pelo CHECK ${check}: a linha mudou durante a reversao, e o valor anterior nao cabe nela como esta agora. Nada deste fato foi gravado; revise no admin.`;
  }
  return safeErrorMessage(err).slice(0, 200);
}

export const revertSyncRun = defineMcpTool({
  name: "revert_sync_run",
  title: "Desfazer uma rodada de sincronizacao",
  description:
    "DESTRUTIVO. Reaplica, na ordem inversa, o valor anterior de cada fato gravado por uma rodada: o que a rodada CRIOU e apagado, o que ela ALTEROU volta ao valor de antes. " +
    "Exige confirm='reverter' para nao ser disparado por engano. So funciona em rodadas ja fechadas (ok/failed) — feche antes com close_sync_run. " +
    "Visibilidade nunca e revertida (promover para publico e decisao humana na UI). " +
    "As regras do dossie valem aqui tambem: voltar a um estagio aberto remove o motivo de encerramento gravado depois da rodada (e registra qual na linha do tempo), e a situacao de uma entrevista acompanha a data restaurada. O que a regra nao deixa voltar aparece em 'falhas', com o motivo; o que ela mudou alem do valor anterior, em 'ajustes'. " +
    "Os registros de SyncState escritos pela rodada sao apagados, para que a proxima chamada de check_sync_state peca os arquivos de novo.",
  scopes: ["sync:write"],
  inputSchema: {
    syncRunId: syncRunIdSchema,
    confirm: z
      .literal("reverter")
      .describe("Escreva exatamente 'reverter' para confirmar a operacao destrutiva."),
    dryRun: z
      .boolean()
      .default(false)
      .describe("true = apenas relata o que seria desfeito, sem tocar em nada."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  async handler(args, ctx) {
    requireDb();
    const run = await db.syncRun.findUnique({
      where: { id: args.syncRunId },
      select: { id: true, status: true, apiKeyId: true },
    });
    if (!run) throw new McpToolError("syncRunId desconhecido.", "invalid_arguments");
    if (run.apiKeyId && run.apiKeyId !== ctx.apiKeyId) {
      throw new McpToolError(
        "Esta rodada de sincronizacao pertence a outra chave de API.",
        "invalid_arguments"
      );
    }
    if (run.status === "running") {
      throw new McpToolError(
        "Feche a rodada com close_sync_run antes de reverter — reverter uma rodada em andamento perderia as escritas que ainda estao chegando.",
        "invalid_arguments"
      );
    }
    if (run.status === "reverted") {
      throw new McpToolError("Esta rodada ja foi revertida.", "invalid_arguments");
    }

    const facts = await db.provenance.findMany({
      where: { syncRunId: run.id },
      orderBy: { recordedAt: "desc" },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        before: true,
        sourcePath: true,
      },
    });

    const plano = {
      apagar: facts.filter((f) => f.before === null).length,
      restaurar: facts.filter((f) => f.before !== null).length,
      entidadesDesconhecidas: [
        ...new Set(facts.filter((f) => !REVERTERS[f.entityType]).map((f) => f.entityType)),
      ],
    };

    if (args.dryRun) {
      return jsonResult({
        syncRunId: run.id,
        dryRun: true,
        fatos: facts.length,
        plano,
        instrucao: "Nada foi alterado. Repita sem dryRun para aplicar.",
      });
    }

    let apagados = 0;
    let restaurados = 0;
    const falhas: { entityType: string; entityId: string; erro: string }[] = [];
    const ajustes: { entityType: string; entityId: string; nota: string }[] = [];

    for (const fact of facts) {
      const delegate = reverterFor(fact.entityType);
      if (!delegate) {
        falhas.push({
          entityType: fact.entityType,
          entityId: fact.entityId,
          erro: "tipo de entidade sem reversor registrado",
        });
        continue;
      }
      try {
        if (fact.before === null) {
          await delegate.delete({ where: { id: fact.entityId } });
          apagados += 1;
        } else {
          const restored: Scalars = {};
          for (const [key, value] of Object.entries(fact.before as Scalars)) {
            if (!NEVER_REVERT.has(key)) restored[key] = value;
          }
          const plan = await planRestore(fact.entityType, fact.entityId, restored, ctx, run.id);
          if (Object.keys(plan.data).length > 0) {
            const update = delegate.update({ where: { id: fact.entityId }, data: plan.data });
            if (plan.evento) {
              await db.$transaction([
                update as Prisma.PrismaPromise<unknown>,
                db.applicationEvent.create({ data: plan.evento }),
              ]);
            } else {
              await update;
            }
          }
          for (const nota of plan.ajustes) {
            ajustes.push({ entityType: fact.entityType, entityId: fact.entityId, nota });
          }
          if (plan.recusas.length > 0) {
            falhas.push({
              entityType: fact.entityType,
              entityId: fact.entityId,
              erro: `Restaurado em parte: ${plan.recusas.join(" ")} O resto deste fato voltou.`,
            });
          } else {
            restaurados += 1;
          }
        }
      } catch (err) {
        // Linha ja apagada por cascade, ou FK que impede a ordem escolhida.
        // Registrar e seguir e melhor do que abortar no meio: um rollback
        // parcial relatado e auditavel; um que morre calado, nao.
        falhas.push({
          entityType: fact.entityType,
          entityId: fact.entityId,
          erro: revertFailureMessage(err),
        });
      }
    }

    // O sha256 guardado precisa sumir junto, senao check_sync_state diria
    // "inalterado" para um arquivo cujo conteudo acabou de ser desfeito.
    const syncStates = await db.syncState.deleteMany({ where: { lastSyncRunId: run.id } });

    await db.syncRun.update({
      where: { id: run.id },
      data: { status: "reverted", revertedAt: new Date(), finishedAt: new Date() },
    });

    return jsonResult({
      syncRunId: run.id,
      fatos: facts.length,
      apagados,
      restaurados,
      syncStateRemovidos: syncStates.count,
      falhas,
      ajustes,
      contexto: { auditId: ctx.auditId },
      instrucao:
        falhas.length > 0
          ? "Rollback parcial: as falhas acima nao foram desfeitas e precisam de revisao humana no admin."
          : "Rodada revertida por completo. A proxima sincronizacao vai reenviar os arquivos afetados.",
    });
  },
});
