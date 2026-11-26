import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveInterviewState } from "@/lib/interviews";
import { defineMcpTool, jsonResult, McpToolError } from "@/lib/mcp/tool";
import {
  assertOpenSyncRun,
  bumpSyncRun,
  childStamp,
  dateTimeSchema,
  finishWrite,
  interviewStatusSchema,
  keySchema,
  markdownSchema,
  normalizeKey,
  omitUndefined,
  pathSchema,
  requireDb,
  shortSchema,
  syncRunIdSchema,
  timezoneSchema,
  toDate,
  type SyncContextInput,
} from "@/lib/mcp/tools/_common";
import { requireApplicationId, requireContactId } from "@/lib/mcp/tools/_entities";

/**
 * Interviews: what is still ahead in a selection process, planned or scheduled,
 * and what already happened.
 *
 * `sourceKey` is the natural key. The database makes it unique across every
 * application, so a key that already belongs to an interview of another one is
 * refused: accepting it would move that interview to the wrong dossier.
 */

/** `screening`, `system_design`: one word, never a sentence. */
const kindSchema = z
  .string()
  .max(60)
  .regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/, "use minusculas, digitos, '_' ou '-' (ex.: 'system_design')");

export const upsertInterview = defineMcpTool({
  name: "upsert_interview",
  title: "Criar ou atualizar uma entrevista",
  description:
    "Upsert de uma entrevista de uma candidatura pela CHAVE NATURAL 'sourceKey' (ex.: 'epilot#interview#1'): repetir a mesma chamada nao cria outra, e campos omitidos nao sao apagados. A candidatura precisa existir; esta tool nunca cria uma. " +
    "Registre TODAS as entrevistas que o recrutador anunciou, mesmo sem data: sem 'scheduledAt' ela nasce 'planned' (prevista), e 'orderIndex' da a ordem no processo. Nao invente entrevistas que ninguem anunciou. " +
    "Situacoes: planned (prevista, sem data), scheduled (marcada, com data e hora), completed (realizada, com data) e cancelled. Sem 'status', a data decide: uma prevista que ganha data vira marcada, e uma marcada com scheduledAt: null volta a prevista. Marcar ou dar como realizada sem data e recusado. " +
    "Para registrar que algo ja aconteceu (um e-mail, uma resposta) use 'log_application_event'.",
  scopes: ["applications:write"],
  inputSchema: {
    folderName: keySchema.describe("CHAVE NATURAL da candidatura. Obrigatorio; a candidatura precisa existir."),
    sourceKey: keySchema.describe("CHAVE NATURAL da entrevista: estavel e unica (ex.: '<pasta>#interview#1'). Obrigatorio."),
    kind: kindSchema
      .optional()
      .describe("screening | technical | system_design | culture | behavioral | hiring_manager | final ... Obrigatorio ao criar."),
    orderIndex: z
      .number()
      .int()
      .min(0)
      .max(99)
      .optional()
      .describe("Posicao no processo, a partir de 0. Se omitido ao criar, entra depois da ultima."),
    round: z.number().int().min(1).max(99).optional().describe("Numero da rodada, so quando a empresa numera."),
    status: interviewStatusSchema.optional().describe("planned | scheduled | completed | cancelled."),
    scheduledAt: dateTimeSchema
      .nullable()
      .optional()
      .describe("Data E hora com fuso (ex.: '2026-12-01T14:30:00-03:00'). null remove a data."),
    durationMin: z.number().int().min(5).max(1_440).optional(),
    mode: z.enum(["video", "phone", "onsite"]).optional(),
    timezone: timezoneSchema.optional().describe("Fuso IANA de quem entrevista (ex.: 'America/Toronto')."),
    interviewers: z.array(shortSchema.min(1)).max(20).optional().describe("Nomes de quem entrevista. Substitui a lista."),
    contactName: shortSchema.optional().describe("Nome de um contato ja gravado nesta candidatura/empresa, para vincular."),
    prepMd: markdownSchema.optional().describe("Preparacao."),
    notesMd: markdownSchema.optional().describe("Anotacoes do que foi dito."),
    outcome: z
      .enum(["passed", "failed", "pending"])
      .optional()
      .describe("Resultado. Uma entrevista cancelada nao tem resultado: use status 'cancelled'."),
    sourcePath: pathSchema.optional(),
    syncRunId: syncRunIdSchema.optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  async handler(args, ctx) {
    requireDb();
    const folderName = normalizeKey(args.folderName, "folderName");
    const sourceKey = normalizeKey(args.sourceKey, "sourceKey");
    const syncRunId = await assertOpenSyncRun(args.syncRunId, ctx);
    const sync: SyncContextInput = {
      syncRunId,
      source: args.sourcePath ? { path: args.sourcePath } : undefined,
    };
    const app = await requireApplicationId(folderName);

    const before = await db.interview.findUnique({ where: { sourceKey } });
    if (before && before.applicationId !== app.id) {
      throw new McpToolError(
        `A sourceKey '${sourceKey}' ja pertence a uma entrevista de outra candidatura. Use uma chave propria desta (ex.: '${folderName}#interview#1').`,
        "invalid_arguments"
      );
    }
    const kind = args.kind ?? before?.kind;
    if (!kind) {
      throw new McpToolError("kind e obrigatorio ao criar uma entrevista.", "invalid_arguments");
    }

    const state = resolveInterviewState(before, {
      status: args.status,
      scheduledAt:
        args.scheduledAt === null ? null : toDate(args.scheduledAt, "scheduledAt"),
    });
    if (!state.ok) throw new McpToolError(state.message, "invalid_arguments");

    const contactId = args.contactName
      ? await requireContactId(args.contactName, app.id)
      : undefined;

    const facts = {
      kind,
      orderIndex: args.orderIndex ?? before?.orderIndex ?? (await nextOrderIndex(app.id)),
      status: state.status,
      scheduledAt: state.scheduledAt,
      ...omitUndefined({
        round: args.round,
        durationMin: args.durationMin,
        mode: args.mode,
        timezone: args.timezone,
        interviewers: args.interviewers,
        contactId,
        prepMd: args.prepMd,
        notesMd: args.notesMd,
        outcome: args.outcome,
      }),
    };
    const stamp = childStamp(ctx, sync);

    const row = await db.interview.upsert({
      where: { sourceKey },
      create: { sourceKey, applicationId: app.id, ...facts, ...stamp },
      update: { ...facts, ...stamp },
      select: { id: true },
    });

    const outcome = await finishWrite({
      entityType: "Interview",
      entityId: row.id,
      created: !before,
      before: before as unknown as Record<string, unknown> | null,
      after: { sourceKey, ...facts },
      sync,
      ctx,
    });
    await bumpSyncRun(syncRunId, { entitiesWritten: outcome.alterado ? 1 : 0, toolCalls: 1 });

    return jsonResult({
      applicationId: app.id,
      folderName,
      entrevista: {
        ...outcome,
        sourceKey,
        orderIndex: facts.orderIndex,
        status: state.status,
        scheduledAt: state.scheduledAt ? state.scheduledAt.toISOString() : null,
      },
      contexto: { syncRunId: syncRunId ?? null, auditId: ctx.auditId },
    });
  },
});

/** The position after the last interview of this application. */
async function nextOrderIndex(applicationId: string): Promise<number> {
  const last = await db.interview.findFirst({
    where: { applicationId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });
  return last ? last.orderIndex + 1 : 0;
}
