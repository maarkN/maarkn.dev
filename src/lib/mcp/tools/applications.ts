import "server-only";
import { z } from "zod";
import { FunnelStage, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { defineMcpTool, jsonResult, McpToolError, type McpToolContext } from "@/lib/mcp/tool";
import { maskContactPii } from "@/lib/mcp/redact";
import {
  LIMITS,
  assertOpenSyncRun,
  bumpSyncRun,
  childStamp,
  coverageLevelSchema,
  createUntrustedFence,
  dateSchema,
  docKindSchema,
  eventDirectionSchema,
  finishWrite,
  fullStamp,
  funnelStageSchema,
  keySchema,
  markdownSchema,
  normalizeKey,
  normalizePath,
  normalizeUrl,
  omitUndefined,
  pageInfo,
  paginationSchema,
  pathSchema,
  requireDb,
  seenStamp,
  shortSchema,
  sourceFileSchema,
  sponsorshipSchema,
  syncRunIdSchema,
  textSchema,
  toDate,
  touchSyncState,
  urlSchema,
  type SyncContextInput,
  type WriteOutcome,
} from "@/lib/mcp/tools/_common";
import {
  companyInputSchema,
  findJobId,
  requireApplicationId,
  upsertCompany,
} from "@/lib/mcp/tools/_entities";

/**
 * Candidaturas.
 *
 * `Application.folderName` (a pasta em `04 - Candidaturas`) e a chave de
 * dedupe. Nao existe `create_application`: o agente que nao souber a pasta nao
 * escreve nada.
 *
 * As colecoes aninhadas (documentos, contatos, checklist, triagem, matriz de
 * requisitos, avisos de honestidade) sao deduplicadas por chave estavel —
 * `filePath`, `(candidatura, orderIndex)`, `(candidatura, requirementKey)` ou
 * um `sourceKey` que a skill fornece. Onde o banco nao oferece chave composta
 * (avisos de honestidade e eventos), o `sourceKey` e OBRIGATORIO: sem ele,
 * reprocessar a mesma pasta duplicaria linha a cada rodada, que e exatamente o
 * criterio de aceite do F3 ("sincronizar duas vezes nao cria uma linha a mais").
 */

// --------------------------------------------------------------------------
// sub-schemas das colecoes aninhadas
// --------------------------------------------------------------------------

const documentInputSchema = z.object({
  filePath: pathSchema.describe("CHAVE NATURAL do documento: caminho relativo no vault."),
  kind: docKindSchema,
  title: shortSchema.optional(),
  language: z.enum(["pt-BR", "en-US"]).optional().describe("Dossies en-US NAO sao traducao do pt-BR."),
  status: shortSchema.optional().describe("Vocabulario proprio do documento (draft | final | sent...). Nao confunda com o estagio do funil."),
  contentMd: markdownSchema.optional(),
  wordCount: z.number().int().min(0).max(10_000_000).optional(),
  sentAt: dateSchema.optional(),
  sha256: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/)
    .optional()
    .describe("sha256 do arquivo; alimenta o SyncState deste filePath."),
});

const contactInputSchema = z.object({
  name: shortSchema.describe("Nome do contato. Junto da empresa/candidatura, e a chave de dedupe."),
  sourceKey: keySchema.optional().describe("Chave estavel opcional (ex.: 'epilot#contato#1'). Tem precedencia sobre nome+empresa."),
  roleTitle: shortSchema.optional(),
  email: shortSchema.optional(),
  phone: shortSchema.optional(),
  linkedinUrl: urlSchema.optional(),
  timezone: shortSchema.optional(),
  channel: shortSchema.optional().describe("linkedin | email | vanhack | referral ..."),
  notesMd: markdownSchema.optional(),
});

const checklistInputSchema = z.object({
  orderIndex: z.number().int().min(0).max(9_999).describe("Posicao na checklist. Chave de dedupe junto da candidatura."),
  label: textSchema,
  groupLabel: shortSchema.optional(),
  done: z.boolean().optional(),
  doneAt: dateSchema.optional(),
});

const screeningInputSchema = z.object({
  orderIndex: z.number().int().min(0).max(9_999),
  question: textSchema,
  answer: markdownSchema.optional(),
  language: z.enum(["pt-BR", "en-US"]).optional(),
  required: z.boolean().optional(),
});

const coverageInputSchema = z.object({
  requirementKey: keySchema.describe("Slug estavel do requisito (ex.: 'typescript-5-anos'). Chave de dedupe junto da candidatura."),
  requirement: textSchema,
  coverage: coverageLevelSchema.describe("strong (✅forte) | has (✅) | shallow (⚠️) | gap (❌) | advantage (⭐)"),
  evidenceMd: markdownSchema.optional(),
  orderIndex: z.number().int().min(0).max(9_999).optional(),
});

const honestyInputSchema = z.object({
  sourceKey: keySchema.describe("OBRIGATORIO: o banco nao tem chave composta para esta tabela, entao sem sourceKey a nota duplicaria a cada rodada."),
  noteMd: markdownSchema.describe("O aviso literal do vault (as linhas com ⚠️). Nao resuma nem suavize."),
  ruleCode: z.string().max(12).optional().describe("R1..R8, quando o aviso corresponder a uma regra de enquadramento."),
  scope: shortSchema.optional(),
  severity: z.enum(["blocking", "warning", "info"]).optional(),
});

// --------------------------------------------------------------------------
// helpers de escrita das colecoes
// --------------------------------------------------------------------------

async function writeDocuments(
  inputs: z.infer<typeof documentInputSchema>[] | undefined,
  applicationId: string,
  ctx: McpToolContext,
  sync: SyncContextInput
): Promise<WriteOutcome[]> {
  const out: WriteOutcome[] = [];
  for (const input of inputs ?? []) {
    const filePath = normalizePath(input.filePath, "documents[].filePath");
    const facts = omitUndefined({
      applicationId,
      kind: input.kind,
      title: input.title,
      language: input.language,
      status: input.status,
      contentMd: input.contentMd,
      wordCount: input.wordCount,
      sentAt: toDate(input.sentAt, "documents[].sentAt"),
    });
    const docSync: SyncContextInput = {
      syncRunId: sync.syncRunId,
      source: { path: filePath, sha256: input.sha256, generation: sync.source?.generation },
    };
    const stamp = fullStamp(ctx, docSync);
    const before = await db.document.findUnique({ where: { filePath } });
    const row = before
      ? await db.document.update({ where: { filePath }, data: { ...facts, ...stamp } })
      : await db.document.create({
          data: { filePath, kind: input.kind, ...facts, ...stamp },
        });
    out.push(
      await finishWrite({
        entityType: "Document",
        entityId: row.id,
        created: !before,
        before: before as unknown as Record<string, unknown> | null,
        after: { filePath, ...facts },
        sync: docSync,
        ctx,
      })
    );
    await touchSyncState({
      source: input.sha256 ? { path: filePath, sha256: input.sha256 } : undefined,
      entityType: "Document",
      entityId: row.id,
      syncRunId: sync.syncRunId,
    });
  }
  return out;
}

async function writeContacts(
  inputs: z.infer<typeof contactInputSchema>[] | undefined,
  applicationId: string,
  companyId: string | undefined,
  ctx: McpToolContext,
  sync: SyncContextInput
): Promise<WriteOutcome[]> {
  const out: WriteOutcome[] = [];
  for (const input of inputs ?? []) {
    const name = normalizeKey(input.name, "contacts[].name");
    const sourceKey = input.sourceKey ? normalizeKey(input.sourceKey, "contacts[].sourceKey") : undefined;

    // Dedupe: `sourceKey` explicito quando houver; senao o MESMO nome ligado a
    // esta candidatura OU a esta empresa. O `OR` importa: uma rodada pode ter
    // gravado o contato antes de a empresa existir (companyId nulo) e a
    // seguinte ja com a empresa — procurar so por (empresa, nome) criaria um
    // segundo contato para a mesma pessoa.
    const before = sourceKey
      ? await db.contact.findUnique({ where: { sourceKey } })
      : await db.contact.findFirst({
          where: {
            name,
            OR: [{ applicationId }, ...(companyId ? [{ companyId }] : [])],
          },
        });

    const facts = omitUndefined({
      applicationId,
      companyId,
      roleTitle: input.roleTitle,
      email: input.email,
      phone: input.phone,
      linkedinUrl: input.linkedinUrl,
      timezone: input.timezone,
      channel: input.channel,
      notesMd: input.notesMd,
      ...(sourceKey ? { sourceKey } : {}),
    });
    const stamp = seenStamp(ctx, sync);
    const row = before
      ? await db.contact.update({ where: { id: before.id }, data: { ...facts, ...stamp } })
      : await db.contact.create({ data: { name, ...facts, ...stamp } });

    out.push(
      await finishWrite({
        entityType: "Contact",
        entityId: row.id,
        created: !before,
        before: before as unknown as Record<string, unknown> | null,
        after: { name, ...facts },
        sync,
        ctx,
      })
    );
  }
  return out;
}

async function writeChecklist(
  inputs: z.infer<typeof checklistInputSchema>[] | undefined,
  applicationId: string,
  ctx: McpToolContext,
  sync: SyncContextInput
): Promise<WriteOutcome[]> {
  const out: WriteOutcome[] = [];
  for (const input of inputs ?? []) {
    const facts = omitUndefined({
      label: input.label,
      groupLabel: input.groupLabel,
      done: input.done,
      doneAt: toDate(input.doneAt, "checklistItems[].doneAt"),
    });
    const key = { applicationId, orderIndex: input.orderIndex };
    const before = await db.checklistItem.findUnique({
      where: { applicationId_orderIndex: key },
    });
    const row = await db.checklistItem.upsert({
      where: { applicationId_orderIndex: key },
      create: { ...key, label: input.label, ...facts, ...childStamp(ctx, sync) },
      update: { ...facts, ...childStamp(ctx, sync) },
      select: { id: true },
    });
    out.push(
      await finishWrite({
        entityType: "ChecklistItem",
        entityId: row.id,
        created: !before,
        before: before as unknown as Record<string, unknown> | null,
        after: { orderIndex: input.orderIndex, ...facts },
        sync,
        ctx,
      })
    );
  }
  return out;
}

async function writeScreening(
  inputs: z.infer<typeof screeningInputSchema>[] | undefined,
  applicationId: string,
  jobId: string | undefined,
  ctx: McpToolContext,
  sync: SyncContextInput
): Promise<WriteOutcome[]> {
  const out: WriteOutcome[] = [];
  for (const input of inputs ?? []) {
    const facts = omitUndefined({
      question: input.question,
      answer: input.answer,
      language: input.language,
      required: input.required,
      jobId,
    });
    const key = { applicationId, orderIndex: input.orderIndex };
    const before = await db.screeningQuestion.findUnique({
      where: { applicationId_orderIndex: key },
    });
    const row = await db.screeningQuestion.upsert({
      where: { applicationId_orderIndex: key },
      create: { ...key, question: input.question, ...facts, ...childStamp(ctx, sync) },
      update: { ...facts, ...childStamp(ctx, sync) },
      select: { id: true },
    });
    out.push(
      await finishWrite({
        entityType: "ScreeningQuestion",
        entityId: row.id,
        created: !before,
        before: before as unknown as Record<string, unknown> | null,
        after: { orderIndex: input.orderIndex, ...facts },
        sync,
        ctx,
      })
    );
  }
  return out;
}

async function writeCoverage(
  inputs: z.infer<typeof coverageInputSchema>[] | undefined,
  applicationId: string,
  jobId: string | undefined,
  ctx: McpToolContext,
  sync: SyncContextInput
): Promise<WriteOutcome[]> {
  const out: WriteOutcome[] = [];
  for (const input of inputs ?? []) {
    const requirementKey = normalizeKey(input.requirementKey, "requirementCoverages[].requirementKey");
    const facts = omitUndefined({
      requirement: input.requirement,
      coverage: input.coverage,
      evidenceMd: input.evidenceMd,
      orderIndex: input.orderIndex,
      jobId,
    });
    const key = { applicationId, requirementKey };
    const before = await db.requirementCoverage.findUnique({
      where: { applicationId_requirementKey: key },
    });
    const row = await db.requirementCoverage.upsert({
      where: { applicationId_requirementKey: key },
      create: {
        ...key,
        requirement: input.requirement,
        coverage: input.coverage,
        ...facts,
        ...childStamp(ctx, sync),
      },
      update: { ...facts, ...childStamp(ctx, sync) },
      select: { id: true },
    });
    out.push(
      await finishWrite({
        entityType: "RequirementCoverage",
        entityId: row.id,
        created: !before,
        before: before as unknown as Record<string, unknown> | null,
        after: { requirementKey, ...facts },
        sync,
        ctx,
      })
    );
  }
  return out;
}

async function writeHonestyNotes(
  inputs: z.infer<typeof honestyInputSchema>[] | undefined,
  applicationId: string,
  ctx: McpToolContext,
  sync: SyncContextInput
): Promise<WriteOutcome[]> {
  const out: WriteOutcome[] = [];
  for (const input of inputs ?? []) {
    const sourceKey = normalizeKey(input.sourceKey, "honestyNotes[].sourceKey");
    const facts = omitUndefined({
      applicationId,
      noteMd: input.noteMd,
      ruleCode: input.ruleCode,
      scope: input.scope,
      severity: input.severity,
    });
    const before = await db.honestyNote.findUnique({ where: { sourceKey } });
    const row = await db.honestyNote.upsert({
      where: { sourceKey },
      create: { sourceKey, noteMd: input.noteMd, ...facts, ...childStamp(ctx, sync) },
      update: { ...facts, ...childStamp(ctx, sync) },
      select: { id: true },
    });
    out.push(
      await finishWrite({
        entityType: "HonestyNote",
        entityId: row.id,
        created: !before,
        before: before as unknown as Record<string, unknown> | null,
        after: { sourceKey, ...facts },
        sync,
        ctx,
      })
    );
  }
  return out;
}

// --------------------------------------------------------------------------
// mudanca de estagio (compartilhada por upsert_application e update_application_stage)
// --------------------------------------------------------------------------

/** Estagios que fecham o funil — usados para preencher `closedAt` uma unica vez. */
const CLOSING_STAGES: ReadonlySet<FunnelStage> = new Set<FunnelStage>([
  FunnelStage.rejected,
  FunnelStage.withdrawn,
  FunnelStage.accepted,
  FunnelStage.ghosted,
  FunnelStage.no_response,
  FunnelStage.skipped,
]);

type StageChangeResult = {
  alterado: boolean;
  de: FunnelStage | null;
  para: FunnelStage;
  eventoId: string | null;
  camposDerivados: string[];
};

/**
 * Move o estagio e grava o `ApplicationEvent` correspondente.
 *
 * Idempotencia: se o estagio ja e o pedido, NADA acontece — nem update, nem
 * evento. E o que impede a segunda rodada de encher a linha do tempo de
 * "stage_change" identicos.
 */
async function applyStageChange(args: {
  applicationId: string;
  folderName: string;
  from: FunnelStage;
  to: FunnelStage;
  occurredAt?: Date;
  note?: string;
  channel?: string;
  sourceKey?: string;
  ctx: McpToolContext;
  sync: SyncContextInput;
}): Promise<StageChangeResult> {
  if (args.from === args.to) {
    return { alterado: false, de: args.from, para: args.to, eventoId: null, camposDerivados: [] };
  }
  const occurredAt = args.occurredAt ?? new Date();

  // Metricas de conversao: derivadas do proprio estagio, e so quando ainda
  // estao vazias. O vault registra 0 envios hoje; e daqui que a taxa de
  // resposta real vai nascer. Nunca sobrescreve um valor ja existente.
  const current = await db.application.findUnique({
    where: { id: args.applicationId },
    select: { appliedAt: true, closedAt: true },
  });
  const derived: Record<string, Date> = {};
  if (args.to === FunnelStage.applied && !current?.appliedAt) derived.appliedAt = occurredAt;
  if (CLOSING_STAGES.has(args.to) && !current?.closedAt) derived.closedAt = occurredAt;

  const before = { stage: args.from, ...(current ?? {}) };
  await db.application.update({
    where: { id: args.applicationId },
    data: {
      stage: args.to,
      ...derived,
      lastMcpTool: args.ctx.tool,
      lastApiKeyId: args.ctx.apiKeyId,
      lastSyncRunId: args.sync.syncRunId ?? null,
    },
  });

  const sourceKey =
    args.sourceKey ??
    `${args.folderName}#stage#${args.from}->${args.to}@${occurredAt.toISOString().slice(0, 10)}`;

  const eventFacts = {
    applicationId: args.applicationId,
    occurredAt,
    type: "stage_change",
    fromStage: args.from,
    toStage: args.to,
    channel: args.channel ?? null,
    subject: `${args.from} -> ${args.to}`,
    bodyMd: args.note ?? null,
  };
  const event = await db.applicationEvent.upsert({
    where: { sourceKey },
    create: { sourceKey, ...eventFacts, ...childStamp(args.ctx, args.sync) },
    update: { ...eventFacts, ...childStamp(args.ctx, args.sync) },
    select: { id: true },
  });

  await finishWrite({
    entityType: "Application",
    entityId: args.applicationId,
    created: false,
    before,
    after: { stage: args.to, ...derived },
    sync: args.sync,
    ctx: args.ctx,
  });

  return {
    alterado: true,
    de: args.from,
    para: args.to,
    eventoId: event.id,
    camposDerivados: Object.keys(derived),
  };
}

// --------------------------------------------------------------------------
// upsert_application
// --------------------------------------------------------------------------

export const upsertApplication = defineMcpTool({
  name: "upsert_application",
  title: "Criar ou atualizar uma candidatura",
  description:
    "Upsert de uma candidatura pela CHAVE NATURAL 'folderName' (o nome da PASTA em '04 - Candidaturas', ex.: 'epilot' ou 'Huckleberry (Devlane)'). Sem folderName a chamada e recusada — nao existe create_application. " +
    "O nome e normalizado para Unicode NFC no servidor, entao a forma decomposta que o macOS entrega e a forma composta que voce digitou sao a MESMA candidatura. " +
    "Campos omitidos nao sao apagados. Se 'stage' vier diferente do atual, a mudanca tambem gera um evento 'stage_change' — igual a update_application_stage. " +
    "Aceita, na mesma chamada, a empresa (bloco 'company'), o vinculo com a vaga ('jobSourceUrl', que precisa existir), e as colecoes da pasta: documents (chave filePath), contacts, checklistItems (orderIndex), screeningQuestions (orderIndex), requirementCoverages (requirementKey) e honestyNotes (sourceKey obrigatorio). " +
    "Repetir a mesma chamada nao cria nenhuma linha nova. Tudo nasce privado; nao existe argumento de visibilidade. " +
    "Quando um dado nao estiver no arquivo, escreva '_(a preencher)_' — nunca invente metrica, data ou contato.",
  scopes: ["applications:write"],
  inputSchema: {
    folderName: keySchema.describe("CHAVE NATURAL: nome da pasta da candidatura no vault. Obrigatorio."),
    company: companyInputSchema.optional(),
    jobSourceUrl: urlSchema
      .optional()
      .describe("URL da vaga ja gravada por upsert_job. Se nao existir, a chamada e recusada (nao cria vaga fantasma)."),
    stage: funnelStageSchema.optional().describe("Estagio do funil. Vocabulario 1 de 3 — nao confunda com packageStatus."),
    packageStatus: shortSchema.optional().describe("Vocabulario 2 de 3: estado do PACOTE (draft | ready | sent | archived...)."),
    roleTitle: shortSchema.optional(),
    market: shortSchema.optional(),
    sponsorship: sponsorshipSchema.optional().describe("Sobrescreve o sinal da vaga quando a candidatura tem sinal proprio."),
    priority: z.number().int().min(1).max(999).optional(),
    source: shortSchema.optional().describe("vanhack | linkedin | company_site | recruiter | referral ..."),
    appliedAt: dateSchema.optional(),
    firstResponseAt: dateSchema.optional(),
    closedAt: dateSchema.optional(),
    outcomeReason: textSchema.optional(),
    targetSalary: shortSchema.optional().describe("Texto literal do vault. Nunca estime um valor."),
    summaryMd: markdownSchema.optional(),
    notesMd: markdownSchema.optional(),
    documents: z.array(documentInputSchema).max(LIMITS.children).optional(),
    contacts: z.array(contactInputSchema).max(LIMITS.children).optional(),
    checklistItems: z.array(checklistInputSchema).max(LIMITS.children).optional(),
    screeningQuestions: z.array(screeningInputSchema).max(LIMITS.children).optional(),
    requirementCoverages: z.array(coverageInputSchema).max(LIMITS.children).optional(),
    honestyNotes: z.array(honestyInputSchema).max(LIMITS.children).optional(),
    sourceFile: sourceFileSchema.optional().describe("Arquivo do vault que originou estes fatos (alimenta proveniencia e SyncState)."),
    syncRunId: syncRunIdSchema.optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  async handler(args, ctx) {
    requireDb();
    const folderName = normalizeKey(args.folderName, "folderName");
    const syncRunId = await assertOpenSyncRun(args.syncRunId, ctx);
    const sync: SyncContextInput = { syncRunId, source: args.sourceFile };

    let jobId: string | undefined;
    if (args.jobSourceUrl) {
      const found = await findJobId(args.jobSourceUrl);
      if (!found) {
        throw new McpToolError(
          `Nenhuma vaga com sourceUrl '${normalizeUrl(args.jobSourceUrl, "jobSourceUrl")}'. Chame 'upsert_job' antes — a candidatura nao cria vaga fantasma.`,
          "invalid_arguments"
        );
      }
      jobId = found;
    }

    const outcomes: Record<string, unknown> = {};
    let companyId: string | undefined;
    if (args.company) {
      const company = await upsertCompany(args.company, ctx, sync);
      companyId = company.id;
      outcomes.company = company.outcome;
    }

    const facts = omitUndefined({
      jobId,
      companyId,
      packageStatus: args.packageStatus,
      roleTitle: args.roleTitle,
      market: args.market,
      sponsorship: args.sponsorship,
      priority: args.priority,
      source: args.source,
      appliedAt: toDate(args.appliedAt, "appliedAt"),
      firstResponseAt: toDate(args.firstResponseAt, "firstResponseAt"),
      closedAt: toDate(args.closedAt, "closedAt"),
      outcomeReason: args.outcomeReason,
      targetSalary: args.targetSalary,
      summaryMd: args.summaryMd,
      notesMd: args.notesMd,
    });

    const stamp = fullStamp(ctx, sync);
    const existing = await db.application.findUnique({ where: { folderName } });

    let applicationId: string;
    let created: boolean;
    if (!existing) {
      const row = await db.application.create({
        data: {
          folderName,
          ...(args.stage ? { stage: args.stage } : {}),
          ...facts,
          ...stamp,
        },
      });
      applicationId = row.id;
      created = true;
      outcomes.application = await finishWrite({
        entityType: "Application",
        entityId: row.id,
        created: true,
        before: null,
        after: { folderName, stage: row.stage, ...facts },
        sync,
        ctx,
      });
    } else {
      applicationId = existing.id;
      created = false;
      await db.application.update({ where: { id: applicationId }, data: { ...facts, ...stamp } });
      outcomes.application = await finishWrite({
        entityType: "Application",
        entityId: applicationId,
        created: false,
        before: existing as unknown as Record<string, unknown>,
        after: facts,
        sync,
        ctx,
      });
    }

    // Estagio so muda via `applyStageChange`, para que a linha do tempo nunca
    // perca uma transicao — inclusive quando a transicao veio por este upsert.
    let estagio: StageChangeResult | null = null;
    if (args.stage && existing) {
      estagio = await applyStageChange({
        applicationId,
        folderName,
        from: existing.stage,
        to: args.stage,
        ctx,
        sync,
      });
    }

    // Empresa efetiva: a enviada agora, ou a que a candidatura ja tinha. Sem
    // isso, um contato gravado numa rodada sem o bloco `company` nunca casaria
    // com o mesmo contato na rodada seguinte.
    const effectiveCompanyId = companyId ?? existing?.companyId ?? undefined;

    outcomes.documents = await writeDocuments(args.documents, applicationId, ctx, sync);
    outcomes.contacts = await writeContacts(
      args.contacts,
      applicationId,
      effectiveCompanyId,
      ctx,
      sync
    );
    outcomes.checklistItems = await writeChecklist(args.checklistItems, applicationId, ctx, sync);
    outcomes.screeningQuestions = await writeScreening(
      args.screeningQuestions,
      applicationId,
      jobId,
      ctx,
      sync
    );
    outcomes.requirementCoverages = await writeCoverage(
      args.requirementCoverages,
      applicationId,
      jobId,
      ctx,
      sync
    );
    outcomes.honestyNotes = await writeHonestyNotes(args.honestyNotes, applicationId, ctx, sync);

    await touchSyncState({
      source: args.sourceFile,
      entityType: "Application",
      entityId: applicationId,
      syncRunId,
    });

    const childOutcomes = Object.values(outcomes)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is WriteOutcome => Boolean(value && (value as WriteOutcome).id));
    await bumpSyncRun(syncRunId, {
      entitiesWritten: childOutcomes.filter((o) => o.alterado).length,
      toolCalls: 1,
    });

    return jsonResult({
      applicationId,
      folderName,
      criado: created,
      estagio,
      ...outcomes,
      contexto: { syncRunId: syncRunId ?? null, auditId: ctx.auditId },
    });
  },
});

// --------------------------------------------------------------------------
// update_application_stage
// --------------------------------------------------------------------------

export const updateApplicationStage = defineMcpTool({
  name: "update_application_stage",
  title: "Mover a candidatura de estagio",
  description:
    "Move uma candidatura (identificada pelo folderName) para outro estagio do funil E grava o 'application_event' correspondente, com fromStage/toStage — as duas coisas sempre juntas, nunca uma sem a outra. " +
    "Se o estagio pedido ja for o atual, nada acontece e nenhum evento e criado (idempotente). " +
    "Preenche automaticamente 'appliedAt' ao entrar em 'applied' e 'closedAt' ao entrar num estagio terminal, e SO quando esses campos ainda estao vazios — nunca sobrescreve uma data ja registrada. " +
    "A candidatura precisa existir: esta tool nunca cria uma.",
  scopes: ["applications:write"],
  inputSchema: {
    folderName: keySchema.describe("CHAVE NATURAL da candidatura. Obrigatorio."),
    stage: funnelStageSchema.describe("Estagio de destino."),
    occurredAt: dateSchema.optional().describe("Quando a mudanca aconteceu de verdade (default: agora)."),
    note: markdownSchema.optional().describe("Contexto da mudanca; vira o corpo do evento."),
    channel: shortSchema.optional().describe("email | linkedin | phone | portal ..."),
    sourceKey: keySchema.optional().describe("Chave estavel do evento. Default: '<pasta>#stage#<de>-><para>@<data>'."),
    syncRunId: syncRunIdSchema.optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  async handler(args, ctx) {
    requireDb();
    const folderName = normalizeKey(args.folderName, "folderName");
    const syncRunId = await assertOpenSyncRun(args.syncRunId, ctx);
    const sync: SyncContextInput = { syncRunId };
    const app = await requireApplicationId(folderName);

    const result = await applyStageChange({
      applicationId: app.id,
      folderName,
      from: app.stage as FunnelStage,
      to: args.stage,
      occurredAt: toDate(args.occurredAt, "occurredAt"),
      note: args.note,
      channel: args.channel,
      sourceKey: args.sourceKey ? normalizeKey(args.sourceKey, "sourceKey") : undefined,
      ctx,
      sync,
    });

    await bumpSyncRun(syncRunId, { entitiesWritten: result.alterado ? 1 : 0, toolCalls: 1 });

    return jsonResult({
      applicationId: app.id,
      folderName,
      ...result,
      mensagem: result.alterado
        ? "Estagio alterado e evento 'stage_change' gravado."
        : "A candidatura ja estava nesse estagio. Nada foi alterado e nenhum evento foi criado.",
      contexto: { syncRunId: syncRunId ?? null, auditId: ctx.auditId },
    });
  },
});

// --------------------------------------------------------------------------
// log_application_event
// --------------------------------------------------------------------------

export const logApplicationEvent = defineMcpTool({
  name: "log_application_event",
  title: "Registrar um evento na linha do tempo da candidatura",
  description:
    "Grava (ou atualiza) um evento da candidatura: e-mail enviado, resposta recebida, entrevista marcada, pacote pronto, nota. " +
    "'sourceKey' e OBRIGATORIO e e a chave de idempotencia — use algo estavel e derivado do arquivo de origem (ex.: 'epilot#event#3'). Sem ela, reprocessar a mesma pasta duplicaria a linha do tempo a cada rodada. " +
    "Use 'direction' apenas quando o evento for comunicacao (inbound = veio do recrutador, outbound = saiu de voce); deixe vazio para eventos que nao sao troca de mensagem. " +
    "Para mudanca de estagio use 'update_application_stage', que ja grava o evento certo com fromStage/toStage.",
  scopes: ["applications:write"],
  inputSchema: {
    folderName: keySchema.describe("CHAVE NATURAL da candidatura. Obrigatorio; a candidatura precisa existir."),
    sourceKey: keySchema.describe("OBRIGATORIO: chave estavel do evento, para o upsert ser idempotente."),
    type: shortSchema.describe("email_sent | reply_received | interview_scheduled | note | package_ready | follow_up ..."),
    occurredAt: dateSchema.optional(),
    direction: eventDirectionSchema.optional(),
    channel: shortSchema.optional(),
    subject: shortSchema.optional(),
    bodyMd: markdownSchema.optional(),
    contactName: shortSchema.optional().describe("Nome de um contato ja gravado nesta candidatura/empresa, para vincular o evento."),
    documentFilePath: pathSchema.optional().describe("Documento ja gravado, para vincular o evento."),
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

    let contactId: string | undefined;
    if (args.contactName) {
      const name = normalizeKey(args.contactName, "contactName");
      const contact = await db.contact.findFirst({
        where: { name, OR: [{ applicationId: app.id }, { company: { applications: { some: { id: app.id } } } }] },
        select: { id: true },
      });
      if (!contact) {
        throw new McpToolError(
          `Nenhum contato '${name}' vinculado a esta candidatura. Grave-o antes com 'upsert_application' (bloco contacts).`,
          "invalid_arguments"
        );
      }
      contactId = contact.id;
    }

    let documentId: string | undefined;
    if (args.documentFilePath) {
      const filePath = normalizePath(args.documentFilePath, "documentFilePath");
      const doc = await db.document.findUnique({ where: { filePath }, select: { id: true } });
      if (!doc) {
        throw new McpToolError(
          `Nenhum documento com filePath '${filePath}'. Grave-o antes com 'upsert_application' (bloco documents).`,
          "invalid_arguments"
        );
      }
      documentId = doc.id;
    }

    const facts = omitUndefined({
      applicationId: app.id,
      type: args.type,
      occurredAt: toDate(args.occurredAt, "occurredAt"),
      direction: args.direction,
      channel: args.channel,
      subject: args.subject,
      bodyMd: args.bodyMd,
      contactId,
      documentId,
    });

    const before = await db.applicationEvent.findUnique({ where: { sourceKey } });
    const row = await db.applicationEvent.upsert({
      where: { sourceKey },
      create: {
        sourceKey,
        applicationId: app.id,
        type: args.type,
        ...facts,
        ...childStamp(ctx, sync),
      },
      update: { ...facts, ...childStamp(ctx, sync) },
      select: { id: true },
    });

    const outcome = await finishWrite({
      entityType: "ApplicationEvent",
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
      evento: outcome,
      contexto: { syncRunId: syncRunId ?? null, auditId: ctx.auditId },
    });
  },
});

// --------------------------------------------------------------------------
// list_applications
// --------------------------------------------------------------------------

export const listApplications = defineMcpTool({
  name: "list_applications",
  title: "Listar candidaturas",
  description:
    "Lista candidaturas com filtros server-side e paginacao: estagio (aceita varios), mercado, sinal de patrocinio, empresa, estado do pacote e texto livre. " +
    "Use antes de qualquer upsert para descobrir o folderName exato de uma candidatura e evitar criar uma duplicata com o nome ligeiramente diferente. " +
    "Devolve so o cabecalho de cada candidatura; para o dossie completo use 'get_application'.",
  scopes: ["applications:read"],
  inputSchema: {
    stage: z.array(funnelStageSchema).max(21).optional().describe("Lista de estagios aceitos (OR entre eles)."),
    market: shortSchema.optional(),
    sponsorship: z.array(sponsorshipSchema).max(8).optional(),
    companyFolderName: shortSchema.optional(),
    packageStatus: shortSchema.optional(),
    query: shortSchema.optional().describe("Texto livre: casa com folderName, cargo e nome da empresa."),
    orderBy: z.enum(["recent", "priority", "stage", "folderName"]).default("recent"),
    ...paginationSchema,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  async handler(args) {
    requireDb();

    const where: Prisma.ApplicationWhereInput = {
      ...(args.stage?.length ? { stage: { in: args.stage } } : {}),
      ...(args.market ? { market: { equals: args.market, mode: "insensitive" } } : {}),
      ...(args.sponsorship?.length ? { sponsorship: { in: args.sponsorship } } : {}),
      ...(args.packageStatus ? { packageStatus: { equals: args.packageStatus, mode: "insensitive" } } : {}),
      ...(args.companyFolderName
        ? { company: { folderName: normalizeKey(args.companyFolderName, "companyFolderName") } }
        : {}),
      ...(args.query
        ? {
            OR: [
              { folderName: { contains: args.query, mode: "insensitive" } },
              { roleTitle: { contains: args.query, mode: "insensitive" } },
              { company: { name: { contains: args.query, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ApplicationOrderByWithRelationInput =
      args.orderBy === "priority"
        ? { priority: "asc" }
        : args.orderBy === "stage"
          ? { stage: "asc" }
          : args.orderBy === "folderName"
            ? { folderName: "asc" }
            : { updatedAt: "desc" };

    const [total, rows, porEstagio] = await Promise.all([
      db.application.count({ where }),
      db.application.findMany({
        where,
        orderBy,
        skip: args.offset,
        take: args.limit,
        select: {
          id: true,
          folderName: true,
          stage: true,
          packageStatus: true,
          roleTitle: true,
          market: true,
          sponsorship: true,
          priority: true,
          source: true,
          appliedAt: true,
          firstResponseAt: true,
          closedAt: true,
          outcomeReason: true,
          updatedAt: true,
          company: { select: { folderName: true, name: true } },
          job: { select: { sourceUrl: true, title: true, sponsorship: true } },
          _count: { select: { documents: true, events: true, checklistItems: true } },
        },
      }),
      db.application.groupBy({ by: ["stage"], where, _count: { _all: true } }),
    ]);

    return jsonResult({
      pagina: pageInfo(total, args.limit, args.offset),
      funil: porEstagio
        .map((row) => ({ stage: row.stage, total: row._count._all }))
        .sort((a, b) => b.total - a.total),
      candidaturas: rows.map((row) => ({
        applicationId: row.id,
        folderName: row.folderName,
        stage: row.stage,
        packageStatus: row.packageStatus,
        roleTitle: row.roleTitle,
        market: row.market,
        sponsorship: row.sponsorship ?? row.job?.sponsorship ?? null,
        priority: row.priority,
        source: row.source,
        empresa: row.company,
        vaga: row.job,
        appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
        firstResponseAt: row.firstResponseAt ? row.firstResponseAt.toISOString() : null,
        closedAt: row.closedAt ? row.closedAt.toISOString() : null,
        outcomeReason: row.outcomeReason,
        atualizadaEm: row.updatedAt.toISOString(),
        contagens: row._count,
      })),
    });
  },
});

// --------------------------------------------------------------------------
// get_application
// --------------------------------------------------------------------------

export const getApplication = defineMcpTool({
  name: "get_application",
  title: "Ler o dossie completo de uma candidatura",
  description:
    "Devolve uma candidatura pelo folderName, com empresa, vaga, checklist, triagem, matriz de requisitos, avisos de honestidade, linha do tempo e a lista de documentos. " +
    "O corpo dos documentos so vem com includeDocumentContent=true (pode ser grande). " +
    "Por decisao de minimizacao, e-mail e telefone de contatos NAO sao devolvidos por esta porta — apenas nome, cargo, canal e se ha contato registrado. O mesmo vale para a prosa livre (notas, resumo, corpo de eventos, documentos): e-mail e telefone de terceiros saem mascarados. Esses dados ficam na UI do admin.",
  scopes: ["applications:read"],
  inputSchema: {
    folderName: keySchema.describe("CHAVE NATURAL da candidatura."),
    includeDocumentContent: z.boolean().default(false),
    includeEvents: z.boolean().default(true),
    maxEvents: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  async handler(args) {
    requireDb();
    const folderName = normalizeKey(args.folderName, "folderName");

    const row = await db.application.findUnique({
      where: { folderName },
      include: {
        company: true,
        job: { include: { techs: { select: { tech: true, required: true } } } },
        resumeTemplate: { select: { key: true, family: true, name: true } },
        documents: {
          orderBy: { filePath: "asc" },
          select: {
            filePath: true,
            kind: true,
            title: true,
            language: true,
            status: true,
            wordCount: true,
            sentAt: true,
            contentMd: args.includeDocumentContent,
          },
        },
        contacts: {
          select: {
            name: true,
            roleTitle: true,
            channel: true,
            timezone: true,
            linkedinUrl: true,
            email: true,
            phone: true,
          },
        },
        checklistItems: { orderBy: { orderIndex: "asc" } },
        screeningQuestions: { orderBy: { orderIndex: "asc" } },
        requirementCoverages: { orderBy: { orderIndex: "asc" } },
        honestyNotes: true,
        interviews: { orderBy: { scheduledAt: "asc" } },
        events: args.includeEvents
          ? { orderBy: { occurredAt: "desc" }, take: args.maxEvents }
          : false,
      },
    });

    if (!row) {
      throw new McpToolError(
        `Nenhuma candidatura com folderName '${folderName}'. Use 'list_applications' para descobrir o nome exato da pasta.`,
        "invalid_arguments"
      );
    }

    // UMA cerca por resposta: o aviso e todas as pontas de bloco desta
    // resposta citam o mesmo nonce, e nenhum texto copiado consegue adivinha-lo
    // para forjar o fechamento e "sair" do bloco.
    const fence = createUntrustedFence();

    return jsonResult({
      aviso: fence.aviso,
      applicationId: row.id,
      folderName: row.folderName,
      stage: row.stage,
      packageStatus: row.packageStatus,
      roleTitle: row.roleTitle,
      market: row.market,
      sponsorship: row.sponsorship ?? row.job?.sponsorship ?? null,
      priority: row.priority,
      source: row.source,
      targetSalary: row.targetSalary,
      appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
      firstResponseAt: row.firstResponseAt ? row.firstResponseAt.toISOString() : null,
      closedAt: row.closedAt ? row.closedAt.toISOString() : null,
      outcomeReason: row.outcomeReason,
      // Minimizacao (ver `contatos` abaixo): a promessa "e-mail e telefone de
      // contato nao saem por esta porta" so vale se valer tambem para a prosa,
      // que e onde a nota do vault costuma repetir o telefone do recrutador.
      summaryMd: maskContactPii(row.summaryMd),
      notesMd: maskContactPii(row.notesMd),
      empresa: row.company
        ? {
            folderName: row.company.folderName,
            name: row.company.name,
            publicName: row.company.publicName,
            ndaProtected: row.company.ndaProtected,
            market: row.company.market,
            country: row.company.country,
            city: row.company.city,
            careersUrl: row.company.careersUrl,
          }
        : null,
      vaga: row.job
        ? {
            sourceUrl: row.job.sourceUrl,
            title: row.job.title,
            seniority: row.job.seniority,
            market: row.job.market,
            workMode: row.job.workMode,
            employmentType: row.job.employmentType,
            sponsorship: row.job.sponsorship,
            salaryText: row.job.salaryText,
            // Copiados do anuncio publicado por terceiro: delimitados.
            requirementsMd: fence.wrap("requisitos da vaga", row.job.requirementsMd),
            descriptionMd: fence.wrap("descricao da vaga", row.job.descriptionMd),
            techs: row.job.techs,
          }
        : null,
      template: row.resumeTemplate,
      documentos: row.documents.map((doc) => ({
        ...doc,
        contentMd: maskContactPii(doc.contentMd as string | null | undefined),
        sentAt: doc.sentAt ? doc.sentAt.toISOString() : null,
      })),
      // Minimizacao deliberada: o MCP nao e a porta para PII de terceiros.
      contatos: row.contacts.map((contact) => ({
        name: contact.name,
        roleTitle: contact.roleTitle,
        channel: contact.channel,
        timezone: contact.timezone,
        linkedinUrl: contact.linkedinUrl,
        temEmail: Boolean(contact.email),
        temTelefone: Boolean(contact.phone),
      })),
      checklist: row.checklistItems.map((item) => ({
        orderIndex: item.orderIndex,
        label: item.label,
        groupLabel: item.groupLabel,
        done: item.done,
      })),
      triagem: row.screeningQuestions.map((item) => ({
        orderIndex: item.orderIndex,
        question: item.question,
        answer: item.answer,
        language: item.language,
        required: item.required,
      })),
      matrizRequisitos: row.requirementCoverages.map((item) => ({
        requirementKey: item.requirementKey,
        requirement: item.requirement,
        coverage: item.coverage,
        evidenceMd: item.evidenceMd,
      })),
      avisosDeHonestidade: row.honestyNotes.map((note) => ({
        sourceKey: note.sourceKey,
        ruleCode: note.ruleCode,
        severity: note.severity,
        noteMd: note.noteMd,
      })),
      entrevistas: row.interviews.map((item) => ({
        round: item.round,
        kind: item.kind,
        scheduledAt: item.scheduledAt ? item.scheduledAt.toISOString() : null,
        mode: item.mode,
        outcome: item.outcome,
      })),
      linhaDoTempo: (row.events ?? []).map((event) => ({
        sourceKey: event.sourceKey,
        occurredAt: event.occurredAt.toISOString(),
        type: event.type,
        direction: event.direction,
        fromStage: event.fromStage,
        toStage: event.toStage,
        channel: event.channel,
        // Assunto de e-mail de recrutador e texto de terceiro igual ao corpo:
        // cabe uma linha inteira de instrucao forjada. Mesma cerca.
        subject:
          event.direction === "inbound"
            ? fence.wrap("assunto recebido", maskContactPii(event.subject))
            : maskContactPii(event.subject),
        // Corpo de e-mail/mensagem de recrutador: escrito por terceiro, e
        // tipicamente com assinatura (telefone/e-mail) no rodape.
        bodyMd:
          event.direction === "inbound"
            ? fence.wrap("mensagem recebida", maskContactPii(event.bodyMd))
            : maskContactPii(event.bodyMd),
      })),
    });
  },
});
