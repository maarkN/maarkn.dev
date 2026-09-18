import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { defineMcpTool, jsonResult, McpToolError } from "@/lib/mcp/tool";
import {
  LIMITS,
  assertOpenSyncRun,
  bumpSyncRun,
  finishWrite,
  fullStamp,
  markdownSchema,
  normalizeKey,
  normalizeSlug,
  normalizeUrl,
  omitUndefined,
  UNTRUSTED_NOTICE,
  pageInfo,
  paginationSchema,
  requireDb,
  shortSchema,
  sourceFileSchema,
  sponsorshipSchema,
  syncRunIdSchema,
  toDate,
  touchSyncState,
  untrusted,
  urlSchema,
  dateSchema,
  type WriteOutcome,
} from "@/lib/mcp/tools/_common";
import { companyInputSchema, upsertCompany } from "@/lib/mcp/tools/_entities";

/**
 * Vagas (radar + vagas de candidatura).
 *
 * `Job.sourceUrl` e a chave de dedupe. Ela e normalizada no servidor (sem
 * fragmento, sem barra final redundante) porque a mesma vaga chega com `#apply`
 * numa rodada e sem nada na outra — e duas linhas por causa de um `#` derrubam
 * o radar inteiro.
 */

const techInputSchema = z.object({
  tech: shortSchema.describe("Tecnologia como aparece NA VAGA (texto literal)."),
  skillSlug: shortSchema.optional().describe("Slug normalizado que casa com Skill.slug, quando reconhecido."),
  required: z.boolean().optional(),
  yearsRequired: z.number().int().min(0).max(60).optional(),
  rank: z.number().int().min(0).max(999).optional(),
});

export const upsertJob = defineMcpTool({
  name: "upsert_job",
  title: "Criar ou atualizar uma vaga",
  description:
    "Upsert de uma vaga pela CHAVE NATURAL 'sourceUrl' (URL do anuncio). Sem sourceUrl a chamada e recusada — nao existe create_job. " +
    "A URL e canonicalizada no servidor (fragmento removido, barra final redundante removida), entao a mesma vaga enviada com '#apply' numa rodada e sem ele na outra continua sendo UMA linha. " +
    "Na criacao, 'title' e obrigatorio. Campos omitidos NAO sao apagados. " +
    "Pode criar/atualizar a empresa junto (bloco 'company', chave natural companyFolderName = pasta do vault) e a stack exigida ('techs', deduplicada por (vaga, tech)). " +
    "'sponsorship' e criterio eliminatorio de primeira classe: use 'not_applicable_b2b' para vaga remota contractor e nao confunda com 'silent' (vaga que simplesmente nao fala do assunto). " +
    "Tudo nasce privado; nao existe argumento de visibilidade.",
  scopes: ["jobs:write"],
  inputSchema: {
    sourceUrl: urlSchema.describe("CHAVE NATURAL: URL do anuncio da vaga. Obrigatoria."),
    title: shortSchema.optional().describe("Obrigatorio na criacao."),
    company: companyInputSchema.optional(),
    seniority: shortSchema.optional(),
    market: shortSchema.optional().describe("CA | US-remote | IE | DE | BR ..."),
    locationText: shortSchema.optional(),
    workMode: z.enum(["remote", "hybrid", "onsite"]).optional(),
    employmentType: z.enum(["full_time", "contract", "b2b", "freelance"]).optional(),
    salaryText: shortSchema.optional().describe("Texto literal do anuncio. Nunca estime um numero."),
    salaryMin: z.number().int().min(0).max(100_000_000).optional(),
    salaryMax: z.number().int().min(0).max(100_000_000).optional(),
    currency: z.string().max(8).optional(),
    sponsorship: sponsorshipSchema.optional(),
    descriptionMd: markdownSchema.optional(),
    requirementsMd: markdownSchema.optional(),
    postedAt: dateSchema.optional(),
    closedAt: dateSchema.optional(),
    active: z.boolean().optional(),
    priority: z.number().int().min(1).max(999).optional().describe("1 = maior prioridade."),
    fitScore: z.number().int().min(0).max(100).optional(),
    notesMd: markdownSchema.optional(),
    techs: z.array(techInputSchema).max(LIMITS.children).optional(),
    source: sourceFileSchema.optional(),
    syncRunId: syncRunIdSchema.optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  async handler(args, ctx) {
    requireDb();
    const sourceUrl = normalizeUrl(args.sourceUrl, "sourceUrl");
    const syncRunId = await assertOpenSyncRun(args.syncRunId, ctx);
    const sync = { syncRunId, source: args.source };

    if (
      args.salaryMin !== undefined &&
      args.salaryMax !== undefined &&
      args.salaryMin > args.salaryMax
    ) {
      throw new McpToolError("salaryMin nao pode ser maior que salaryMax.", "invalid_arguments");
    }

    const outcomes: Record<string, WriteOutcome> = {};
    let companyId: string | undefined;
    if (args.company) {
      const company = await upsertCompany(args.company, ctx, sync);
      companyId = company.id;
      outcomes.company = company.outcome;
    }

    const facts = omitUndefined({
      title: args.title,
      companyId,
      seniority: args.seniority,
      market: args.market,
      locationText: args.locationText,
      workMode: args.workMode,
      employmentType: args.employmentType,
      salaryText: args.salaryText,
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      currency: args.currency,
      sponsorship: args.sponsorship,
      descriptionMd: args.descriptionMd,
      requirementsMd: args.requirementsMd,
      postedAt: toDate(args.postedAt, "postedAt"),
      closedAt: toDate(args.closedAt, "closedAt"),
      active: args.active,
      priority: args.priority,
      fitScore: args.fitScore,
      notesMd: args.notesMd,
    });

    const stamp = fullStamp(ctx, sync);
    const existing = await db.job.findUnique({ where: { sourceUrl } });

    let jobId: string;
    if (!existing) {
      if (!args.title) {
        throw new McpToolError(
          "Vaga nova exige 'title'. Nao invente um titulo — releia o anuncio ou o arquivo do vault.",
          "invalid_arguments"
        );
      }
      const created = await db.job.create({
        data: { sourceUrl, title: args.title, ...facts, ...stamp },
      });
      jobId = created.id;
      outcomes.job = await finishWrite({
        entityType: "Job",
        entityId: created.id,
        created: true,
        before: null,
        after: { sourceUrl, ...facts },
        sync,
        ctx,
      });
    } else {
      jobId = existing.id;
      await db.job.update({ where: { id: jobId }, data: { ...facts, ...stamp } });
      outcomes.job = await finishWrite({
        entityType: "Job",
        entityId: jobId,
        created: false,
        before: existing as unknown as Record<string, unknown>,
        after: facts,
        sync,
        ctx,
      });
    }

    const techOutcomes: WriteOutcome[] = [];
    for (const tech of args.techs ?? []) {
      const label = normalizeKey(tech.tech, "techs[].tech");
      const techFacts = omitUndefined({
        skillSlug: tech.skillSlug ? normalizeSlug(tech.skillSlug, "techs[].skillSlug") : undefined,
        required: tech.required,
        yearsRequired: tech.yearsRequired,
        rank: tech.rank,
      });
      const before = await db.jobTech.findUnique({
        where: { jobId_tech: { jobId, tech: label } },
      });
      const row = await db.jobTech.upsert({
        where: { jobId_tech: { jobId, tech: label } },
        create: { jobId, tech: label, ...techFacts },
        update: techFacts,
        select: { id: true },
      });
      techOutcomes.push(
        await finishWrite({
          entityType: "JobTech",
          entityId: row.id,
          created: !before,
          before: before as unknown as Record<string, unknown> | null,
          after: { tech: label, ...techFacts },
          sync,
          ctx,
        })
      );
    }

    await touchSyncState({
      source: args.source,
      entityType: "Job",
      entityId: jobId,
      syncRunId,
    });
    const escritas =
      [outcomes.job, outcomes.company, ...techOutcomes].filter((o) => o?.alterado).length;
    await bumpSyncRun(syncRunId, { entitiesWritten: escritas, toolCalls: 1 });

    return jsonResult({
      jobId,
      sourceUrl,
      ...outcomes,
      techs: techOutcomes,
      contexto: { syncRunId: syncRunId ?? null, auditId: ctx.auditId },
    });
  },
});

// --------------------------------------------------------------------------
// search_jobs
// --------------------------------------------------------------------------

export const searchJobs = defineMcpTool({
  name: "search_jobs",
  title: "Buscar vagas no radar",
  description:
    "Lista vagas com filtros server-side e paginacao. Filtre por texto (titulo, empresa, local), mercado, sinal de patrocinio, vaga ativa, fit minimo e pasta da empresa. " +
    "As duas rotas de contratacao sao filtraveis SEPARADAMENTE: 'not_applicable_b2b' e a rota remota contractor (nao precisa de patrocinio) e nao deve ser confundida com as rotas que exigem autorizacao. " +
    "Por padrao NAO devolve o corpo da descricao (use includeDescription=true quando precisar mesmo, para nao gastar contexto a toa).",
  scopes: ["jobs:read"],
  inputSchema: {
    query: shortSchema.optional().describe("Texto livre: casa com titulo, nome da empresa e local."),
    market: shortSchema.optional(),
    sponsorship: z
      .array(sponsorshipSchema)
      .max(8)
      .optional()
      .describe("Lista de sinais aceitos (OR entre eles)."),
    active: z.boolean().optional(),
    minFitScore: z.number().int().min(0).max(100).optional(),
    companyFolderName: shortSchema.optional(),
    hasApplication: z
      .boolean()
      .optional()
      .describe("true = so vagas com candidatura aberta; false = so vagas ainda sem candidatura."),
    includeDescription: z.boolean().default(false),
    orderBy: z.enum(["priority", "fitScore", "postedAt", "recent"]).default("recent"),
    ...paginationSchema,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  async handler(args) {
    requireDb();

    const where: Prisma.JobWhereInput = {
      ...(args.market ? { market: { equals: args.market, mode: "insensitive" } } : {}),
      ...(args.sponsorship?.length ? { sponsorship: { in: args.sponsorship } } : {}),
      ...(args.active === undefined ? {} : { active: args.active }),
      ...(args.minFitScore === undefined ? {} : { fitScore: { gte: args.minFitScore } }),
      ...(args.companyFolderName
        ? { company: { folderName: normalizeKey(args.companyFolderName, "companyFolderName") } }
        : {}),
      ...(args.hasApplication === undefined
        ? {}
        : args.hasApplication
          ? { applications: { some: {} } }
          : { applications: { none: {} } }),
      ...(args.query
        ? {
            OR: [
              { title: { contains: args.query, mode: "insensitive" } },
              { locationText: { contains: args.query, mode: "insensitive" } },
              { company: { name: { contains: args.query, mode: "insensitive" } } },
              { company: { folderName: { contains: args.query, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.JobOrderByWithRelationInput =
      args.orderBy === "priority"
        ? { priority: "asc" }
        : args.orderBy === "fitScore"
          ? { fitScore: "desc" }
          : args.orderBy === "postedAt"
            ? { postedAt: "desc" }
            : { updatedAt: "desc" };

    const [total, rows] = await Promise.all([
      db.job.count({ where }),
      db.job.findMany({
        where,
        orderBy,
        skip: args.offset,
        take: args.limit,
        select: {
          id: true,
          sourceUrl: true,
          title: true,
          seniority: true,
          market: true,
          locationText: true,
          workMode: true,
          employmentType: true,
          salaryText: true,
          currency: true,
          sponsorship: true,
          priority: true,
          fitScore: true,
          active: true,
          postedAt: true,
          descriptionMd: args.includeDescription,
          company: { select: { folderName: true, name: true, market: true } },
          techs: { select: { tech: true, required: true }, take: 40, orderBy: { rank: "asc" } },
          _count: { select: { applications: true } },
        },
      }),
    ]);

    return jsonResult({
      ...(args.includeDescription ? { aviso: UNTRUSTED_NOTICE } : {}),
      pagina: pageInfo(total, args.limit, args.offset),
      vagas: rows.map((row) => ({
        jobId: row.id,
        sourceUrl: row.sourceUrl,
        title: row.title,
        empresa: row.company
          ? { folderName: row.company.folderName, name: row.company.name, market: row.company.market }
          : null,
        seniority: row.seniority,
        market: row.market,
        locationText: row.locationText,
        workMode: row.workMode,
        employmentType: row.employmentType,
        salaryText: row.salaryText,
        currency: row.currency,
        sponsorship: row.sponsorship,
        priority: row.priority,
        fitScore: row.fitScore,
        active: row.active,
        postedAt: row.postedAt ? row.postedAt.toISOString() : null,
        techs: row.techs.map((tech) => tech.tech),
        candidaturas: row._count.applications,
        // Texto copiado do anuncio: entrada NAO confiavel, entrega delimitada.
        ...(args.includeDescription
          ? { descriptionMd: untrusted("descricao da vaga", row.descriptionMd) }
          : {}),
      })),
    });
  },
});
