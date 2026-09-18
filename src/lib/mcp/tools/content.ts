import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { defineMcpTool, jsonResult, McpToolError, type McpToolContext } from "@/lib/mcp/tool";
import {
  LIMITS,
  assertOpenSyncRun,
  bulletLayerSchema,
  bumpSyncRun,
  childStamp,
  dateSchema,
  finishWrite,
  fullStamp,
  keySchema,
  markdownSchema,
  normalizeKey,
  normalizeSlug,
  omitUndefined,
  requireDb,
  shortSchema,
  sourceFileSchema,
  syncRunIdSchema,
  textSchema,
  toDate,
  touchSyncState,
  urlSchema,
  type SyncContextInput,
  type WriteOutcome,
} from "@/lib/mcp/tools/_common";
import { findCompanyId, skillInputSchema, upsertSkills } from "@/lib/mcp/tools/_entities";

/**
 * Conteudo de carreira: `Experience` (os dossies de `02 - Experiencias`) e
 * `CareerProject` (o dossie PRIVADO de projeto — atencao, o model chama-se
 * `CareerProject`, nao `Project`; `Project` e a vitrine publica do site e o MCP
 * nao escreve nela).
 *
 * Confidencialidade estrutural: as duas tabelas carregam `publicName` (alias
 * anonimizado) e `realName` (nome real do cliente). O `realName` e inelegivel
 * para o indice publico por CHECK no banco — promover exige alias distinto e,
 * em `CareerProject`, `ndaProtected = false`. O MCP nunca promove nada: tudo
 * nasce privado e quem publica e humano, na UI.
 */

const bulletInputSchema = z.object({
  sourceKey: keySchema.describe(
    "OBRIGATORIO: chave estavel do bullet (ex.: 'sevencred#dossier#3'). Sem ela o bullet duplicaria a cada rodada."
  ),
  layer: bulletLayerSchema.describe(
    "Camada de origem — sao TRES paralelas e o gerador escolhe conforme o alvo: dossier (prosa longa pt-BR com metricas), linkedin_strider (prosa media ja lapidada em ingles), cv_master_xyz (X-Y-Z curto)."
  ),
  text: markdownSchema,
  language: z.enum(["pt-BR", "en-US"]).optional(),
  orderIndex: z.number().int().min(0).max(9_999).optional(),
  xAccomplished: textSchema.optional().describe("O X de 'Accomplished [X] as measured by [Y], by doing [Z]'."),
  yMeasuredBy: textSchema.optional().describe("A metrica (Y). Deixe vazio se o vault marca '_(a preencher)_'."),
  zByDoing: textSchema.optional().describe("O como (Z)."),
  metric: shortSchema.optional().describe("A metrica literal citada, para conferencia contra a evidencia."),
  metricConfirmed: z
    .boolean()
    .optional()
    .describe("false quando o vault marca '_(a preencher)_'. NUNCA marque true para um numero plausivel que voce inferiu (regra R5)."),
  keywords: z.array(shortSchema).max(40).optional(),
});

type BulletInput = z.infer<typeof bulletInputSchema>;

async function writeBullets(
  inputs: BulletInput[] | undefined,
  owner: { experienceId?: string; careerProjectId?: string },
  ctx: McpToolContext,
  sync: SyncContextInput
): Promise<WriteOutcome[]> {
  const out: WriteOutcome[] = [];
  for (const input of inputs ?? []) {
    const sourceKey = normalizeKey(input.sourceKey, "bullets[].sourceKey");
    const facts = omitUndefined({
      experienceId: owner.experienceId,
      careerProjectId: owner.careerProjectId,
      layer: input.layer,
      text: input.text,
      language: input.language,
      orderIndex: input.orderIndex,
      xAccomplished: input.xAccomplished,
      yMeasuredBy: input.yMeasuredBy,
      zByDoing: input.zByDoing,
      metric: input.metric,
      metricConfirmed: input.metricConfirmed,
      keywords: input.keywords,
    });
    const before = await db.resumeBullet.findUnique({ where: { sourceKey } });
    const row = await db.resumeBullet.upsert({
      where: { sourceKey },
      create: {
        sourceKey,
        layer: input.layer,
        text: input.text,
        ...facts,
        ...childStamp(ctx, sync),
      },
      update: { ...facts, ...childStamp(ctx, sync) },
      select: { id: true },
    });
    out.push(
      await finishWrite({
        entityType: "ResumeBullet",
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
// upsert_experience
// --------------------------------------------------------------------------

export const upsertExperience = defineMcpTool({
  name: "upsert_experience",
  title: "Criar ou atualizar um vinculo profissional",
  description:
    "Upsert de uma experiencia (dossie de '02 - Experiencias') pela CHAVE NATURAL 'slug' — minusculo, sem espaco. Sem slug a chamada e recusada; nao existe create_experience. " +
    "Na criacao, 'publicName' e 'roleTitle' sao obrigatorios. 'realName' guarda o nome real do cliente e e inelegivel para o indice publico por regra do banco. " +
    "Os dossies en-US NAO sao traducao do pt-BR: envie 'dossierEnMd' com o texto en-US real do vault, nunca uma traducao automatica de 'dossierPtMd'. " +
    "Aceita 'bullets' (com a camada explicita: dossier | linkedin_strider | cv_master_xyz) e 'skills' (conectadas por slug, de forma ADITIVA — nada e desconectado). " +
    "Tudo nasce privado; nao existe argumento de visibilidade.",
  scopes: ["content:write"],
  inputSchema: {
    slug: keySchema.describe("CHAVE NATURAL: slug do vinculo (ex.: 'sevencred', 'acme'). Obrigatorio."),
    publicName: shortSchema.optional().describe("Nome exibivel (pode ser alias sob NDA). Obrigatorio na criacao."),
    realName: shortSchema.optional().describe("Nome real do cliente/empresa. Nunca vai para o indice publico."),
    roleTitle: shortSchema.optional().describe("Cargo em pt-BR. Obrigatorio na criacao."),
    roleTitleEn: shortSchema.optional(),
    companyFolderName: keySchema.optional().describe("Pasta da empresa ja gravada; vincula a experiencia a ela."),
    employmentType: z.enum(["full_time", "contract", "b2b", "freelance"]).optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    current: z.boolean().optional(),
    locationText: shortSchema.optional(),
    market: shortSchema.optional(),
    orderIndex: z.number().int().min(0).max(9_999).optional(),
    summaryPt: markdownSchema.optional(),
    summaryEn: markdownSchema.optional(),
    dossierPtMd: markdownSchema.optional(),
    dossierEnMd: markdownSchema.optional(),
    linkedinSummaryEn: markdownSchema.optional().describe("Camada (b): prosa media ja lapidada em ingles (LinkedIn/Strider)."),
    metricsMd: markdownSchema.optional(),
    bullets: z.array(bulletInputSchema).max(LIMITS.children).optional(),
    skills: z.array(skillInputSchema).max(LIMITS.children).optional(),
    source: sourceFileSchema.optional(),
    syncRunId: syncRunIdSchema.optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  async handler(args, ctx) {
    requireDb();
    const slug = normalizeSlug(args.slug, "slug");
    const syncRunId = await assertOpenSyncRun(args.syncRunId, ctx);
    const sync: SyncContextInput = { syncRunId, source: args.source };

    let companyId: string | undefined;
    if (args.companyFolderName) {
      const found = await findCompanyId(args.companyFolderName);
      if (!found) {
        throw new McpToolError(
          `Nenhuma empresa com folderName '${normalizeKey(args.companyFolderName, "companyFolderName")}'. Grave-a antes por 'upsert_job' ou 'upsert_application'.`,
          "invalid_arguments"
        );
      }
      companyId = found;
    }

    const facts = omitUndefined({
      publicName: args.publicName,
      realName: args.realName,
      roleTitle: args.roleTitle,
      roleTitleEn: args.roleTitleEn,
      companyId,
      employmentType: args.employmentType,
      startDate: toDate(args.startDate, "startDate"),
      endDate: toDate(args.endDate, "endDate"),
      current: args.current,
      locationText: args.locationText,
      market: args.market,
      orderIndex: args.orderIndex,
      summaryPt: args.summaryPt,
      summaryEn: args.summaryEn,
      dossierPtMd: args.dossierPtMd,
      dossierEnMd: args.dossierEnMd,
      linkedinSummaryEn: args.linkedinSummaryEn,
      metricsMd: args.metricsMd,
    });

    const stamp = fullStamp(ctx, sync);
    const existing = await db.experience.findUnique({ where: { slug } });

    let experienceId: string;
    let outcome: WriteOutcome;
    if (!existing) {
      if (!args.publicName || !args.roleTitle) {
        throw new McpToolError(
          "Experiencia nova exige 'publicName' e 'roleTitle'. Nao invente: leia o dossie do vault.",
          "invalid_arguments"
        );
      }
      const created = await db.experience.create({
        data: { slug, publicName: args.publicName, roleTitle: args.roleTitle, ...facts, ...stamp },
      });
      experienceId = created.id;
      outcome = await finishWrite({
        entityType: "Experience",
        entityId: created.id,
        created: true,
        before: null,
        after: { slug, ...facts },
        sync,
        ctx,
      });
    } else {
      experienceId = existing.id;
      await db.experience.update({ where: { id: experienceId }, data: { ...facts, ...stamp } });
      outcome = await finishWrite({
        entityType: "Experience",
        entityId: experienceId,
        created: false,
        before: existing as unknown as Record<string, unknown>,
        after: facts,
        sync,
        ctx,
      });
    }

    const skills = await upsertSkills(args.skills, ctx, sync);
    if (skills.ids.length > 0) {
      await db.experience.update({
        where: { id: experienceId },
        data: { skills: { connect: skills.ids.map((id) => ({ id })) } },
      });
    }
    const bullets = await writeBullets(args.bullets, { experienceId }, ctx, sync);

    await touchSyncState({
      source: args.source,
      entityType: "Experience",
      entityId: experienceId,
      syncRunId,
    });
    await bumpSyncRun(syncRunId, {
      entitiesWritten: [outcome, ...bullets, ...skills.outcomes].filter((o) => o.alterado).length,
      toolCalls: 1,
    });

    return jsonResult({
      experienceId,
      slug,
      experiencia: outcome,
      bullets,
      skills: skills.outcomes,
      contexto: { syncRunId: syncRunId ?? null, auditId: ctx.auditId },
    });
  },
});

// --------------------------------------------------------------------------
// upsert_project (CareerProject)
// --------------------------------------------------------------------------

export const upsertProject = defineMcpTool({
  name: "upsert_project",
  title: "Criar ou atualizar um projeto de carreira",
  description:
    "Upsert de um PROJETO DE CARREIRA (o dossie privado, model CareerProject) pela CHAVE NATURAL 'slug'. Sem slug a chamada e recusada. " +
    "Nao confunda com a vitrine publica do site (model Project): o MCP nao escreve nela. Para amarrar os dois, informe 'portfolioProjectSlug' — o slug do projeto publico ja existente. " +
    "'publicName' e o nome anonimizado exposto (ex.: 'fintech-loan-api'); 'realName' e o nome real do cliente e nunca vai para o indice publico. " +
    "Marque 'ndaProtected' quando houver NDA: o banco impede promover para publico nesse caso. " +
    "Aceita 'bullets' (com camada explicita) e 'skills' (conexao aditiva por slug). Tudo nasce privado.",
  scopes: ["content:write"],
  inputSchema: {
    slug: keySchema.describe("CHAVE NATURAL: slug do projeto (ex.: 'fintech-loan-api'). Obrigatorio."),
    publicName: shortSchema.optional().describe("Nome anonimizado exposto publicamente. Obrigatorio na criacao."),
    realName: shortSchema.optional().describe("Nome real do cliente/produto. Inelegivel para o indice publico."),
    clientCompanyFolderName: keySchema.optional(),
    experienceSlug: keySchema.optional().describe("Vinculo profissional ao qual o projeto pertence."),
    portfolioProjectSlug: keySchema.optional().describe("Slug do Project publico correspondente (vitrine do site), se houver."),
    roleMd: markdownSchema.optional(),
    summaryPt: markdownSchema.optional(),
    summaryEn: markdownSchema.optional(),
    dossierPtMd: markdownSchema.optional(),
    dossierEnMd: markdownSchema.optional().describe("Texto en-US real do vault. Nunca traducao automatica do pt-BR."),
    metricsMd: markdownSchema.optional(),
    techStack: z.array(shortSchema).max(80).optional(),
    repoUrl: urlSchema.optional(),
    demoUrl: urlSchema.optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    ndaProtected: z.boolean().optional(),
    orderIndex: z.number().int().min(0).max(9_999).optional(),
    bullets: z.array(bulletInputSchema).max(LIMITS.children).optional(),
    skills: z.array(skillInputSchema).max(LIMITS.children).optional(),
    source: sourceFileSchema.optional(),
    syncRunId: syncRunIdSchema.optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  async handler(args, ctx) {
    requireDb();
    const slug = normalizeSlug(args.slug, "slug");
    const syncRunId = await assertOpenSyncRun(args.syncRunId, ctx);
    const sync: SyncContextInput = { syncRunId, source: args.source };

    let clientCompanyId: string | undefined;
    if (args.clientCompanyFolderName) {
      const found = await findCompanyId(args.clientCompanyFolderName);
      if (!found) {
        throw new McpToolError(
          `Nenhuma empresa com folderName '${normalizeKey(args.clientCompanyFolderName, "clientCompanyFolderName")}'.`,
          "invalid_arguments"
        );
      }
      clientCompanyId = found;
    }

    let experienceId: string | undefined;
    if (args.experienceSlug) {
      const experienceSlug = normalizeSlug(args.experienceSlug, "experienceSlug");
      const found = await db.experience.findUnique({
        where: { slug: experienceSlug },
        select: { id: true },
      });
      if (!found) {
        throw new McpToolError(
          `Nenhuma experiencia com slug '${experienceSlug}'. Grave-a antes com 'upsert_experience'.`,
          "invalid_arguments"
        );
      }
      experienceId = found.id;
    }

    let portfolioProjectId: string | undefined;
    if (args.portfolioProjectSlug) {
      const projectSlug = normalizeSlug(args.portfolioProjectSlug, "portfolioProjectSlug");
      const found = await db.project.findUnique({
        where: { slug: projectSlug },
        select: { id: true },
      });
      if (!found) {
        throw new McpToolError(
          `Nenhum projeto publico com slug '${projectSlug}'. Esse vinculo e opcional — omita se a vitrine ainda nao existe.`,
          "invalid_arguments"
        );
      }
      const taken = await db.careerProject.findUnique({
        where: { portfolioProjectId: found.id },
        select: { slug: true },
      });
      if (taken && taken.slug !== slug) {
        throw new McpToolError(
          `O projeto publico '${projectSlug}' ja esta vinculado ao dossie '${taken.slug}'. Um projeto do site tem no maximo um dossie.`,
          "invalid_arguments"
        );
      }
      portfolioProjectId = found.id;
    }

    const facts = omitUndefined({
      publicName: args.publicName,
      realName: args.realName,
      clientCompanyId,
      experienceId,
      portfolioProjectId,
      roleMd: args.roleMd,
      summaryPt: args.summaryPt,
      summaryEn: args.summaryEn,
      dossierPtMd: args.dossierPtMd,
      dossierEnMd: args.dossierEnMd,
      metricsMd: args.metricsMd,
      techStack: args.techStack,
      repoUrl: args.repoUrl,
      demoUrl: args.demoUrl,
      startDate: toDate(args.startDate, "startDate"),
      endDate: toDate(args.endDate, "endDate"),
      ndaProtected: args.ndaProtected,
      orderIndex: args.orderIndex,
    });

    const stamp = fullStamp(ctx, sync);
    const existing = await db.careerProject.findUnique({ where: { slug } });

    let careerProjectId: string;
    let outcome: WriteOutcome;
    if (!existing) {
      if (!args.publicName) {
        throw new McpToolError(
          "Projeto novo exige 'publicName' (o nome anonimizado). Nao invente: leia o dossie do vault.",
          "invalid_arguments"
        );
      }
      const created = await db.careerProject.create({
        data: { slug, publicName: args.publicName, ...facts, ...stamp },
      });
      careerProjectId = created.id;
      outcome = await finishWrite({
        entityType: "CareerProject",
        entityId: created.id,
        created: true,
        before: null,
        after: { slug, ...facts },
        sync,
        ctx,
      });
    } else {
      careerProjectId = existing.id;
      await db.careerProject.update({ where: { id: careerProjectId }, data: { ...facts, ...stamp } });
      outcome = await finishWrite({
        entityType: "CareerProject",
        entityId: careerProjectId,
        created: false,
        before: existing as unknown as Record<string, unknown>,
        after: facts,
        sync,
        ctx,
      });
    }

    const skills = await upsertSkills(args.skills, ctx, sync);
    if (skills.ids.length > 0) {
      await db.careerProject.update({
        where: { id: careerProjectId },
        data: { skills: { connect: skills.ids.map((id) => ({ id })) } },
      });
    }
    const bullets = await writeBullets(args.bullets, { careerProjectId }, ctx, sync);

    await touchSyncState({
      source: args.source,
      entityType: "CareerProject",
      entityId: careerProjectId,
      syncRunId,
    });
    await bumpSyncRun(syncRunId, {
      entitiesWritten: [outcome, ...bullets, ...skills.outcomes].filter((o) => o.alterado).length,
      toolCalls: 1,
    });

    return jsonResult({
      careerProjectId,
      slug,
      projeto: outcome,
      bullets,
      skills: skills.outcomes,
      contexto: { syncRunId: syncRunId ?? null, auditId: ctx.auditId },
    });
  },
});
