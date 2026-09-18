import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { McpToolError, type McpToolContext } from "@/lib/mcp/tool";
import {
  finishWrite,
  fullStamp,
  keySchema,
  markdownSchema,
  normalizeKey,
  normalizeSlug,
  normalizeUrl,
  omitUndefined,
  seenStamp,
  shortSchema,
  urlSchema,
  type SyncContextInput,
  type WriteOutcome,
} from "@/lib/mcp/tools/_common";

/**
 * Entidades compartilhadas por mais de uma tool (empresa, skill, candidatura).
 *
 * Empresa aparece em `upsert_job` e em `upsert_application`, e skill aparece em
 * `upsert_experience` e `upsert_project`. Centralizar aqui e o que garante que
 * as duas portas dedupliquem pela MESMA chave natural — duas implementacoes
 * parecidas sao exatamente como `epilot` e `epilot GmbH` viram duas linhas.
 */

// --------------------------------------------------------------------------
// Company
// --------------------------------------------------------------------------

export const companyInputSchema = z.object({
  folderName: keySchema.describe(
    "CHAVE NATURAL: nome da PASTA da empresa no vault. Difere da razao social — a pasta e 'epilot', o nome e 'epilot GmbH'."
  ),
  name: shortSchema.optional().describe("Razao social / nome real. Se omitido na criacao, usa folderName."),
  publicName: shortSchema
    .optional()
    .describe("Alias anonimizado usado em superficie publica quando ha NDA. NAO promove nada para publico."),
  ndaProtected: z.boolean().optional(),
  website: urlSchema.optional(),
  careersUrl: urlSchema.optional(),
  linkedinUrl: urlSchema.optional(),
  country: shortSchema.optional(),
  city: shortSchema.optional(),
  market: shortSchema.optional().describe("CA | US | US-remote | IE | DE | BR ..."),
  industry: shortSchema.optional(),
  sizeBucket: shortSchema.optional(),
  vendorFolderName: keySchema
    .optional()
    .describe("Body shop/intermediaria: a pasta da empresa que INTERMEDIA esta (ex.: Huckleberry -> 'Devlane')."),
  notesMd: markdownSchema.optional(),
});

export type CompanyInput = z.infer<typeof companyInputSchema>;

async function resolveVendorId(
  vendorFolderName: string | undefined,
  ctx: McpToolContext,
  sync: SyncContextInput
): Promise<string | undefined> {
  if (!vendorFolderName) return undefined;
  const folderName = normalizeKey(vendorFolderName, "company.vendorFolderName");
  const existing = await db.company.findUnique({ where: { folderName }, select: { id: true } });
  if (existing) return existing.id;
  // Cria o minimo: a intermediaria costuma nao ter pasta propria no vault.
  const created = await db.company.create({
    data: { folderName, name: folderName, ...seenStamp(ctx, sync) },
    select: { id: true },
  });
  await finishWrite({
    entityType: "Company",
    entityId: created.id,
    created: true,
    before: null,
    after: { folderName, name: folderName },
    sync,
    ctx,
  });
  return created.id;
}

export async function upsertCompany(
  input: CompanyInput,
  ctx: McpToolContext,
  sync: SyncContextInput
): Promise<{ id: string; outcome: WriteOutcome }> {
  const folderName = normalizeKey(input.folderName, "company.folderName");
  const vendorCompanyId = await resolveVendorId(input.vendorFolderName, ctx, sync);

  const existing = await db.company.findUnique({ where: { folderName } });
  if (existing && vendorCompanyId === existing.id) {
    throw new McpToolError(
      "Uma empresa nao pode ser a propria intermediaria (vendorFolderName igual a folderName).",
      "invalid_arguments"
    );
  }

  const facts = omitUndefined({
    name: input.name,
    publicName: input.publicName,
    ndaProtected: input.ndaProtected,
    website: input.website,
    careersUrl: input.careersUrl,
    linkedinUrl: input.linkedinUrl,
    country: input.country,
    city: input.city,
    market: input.market,
    industry: input.industry,
    sizeBucket: input.sizeBucket,
    vendorCompanyId,
    notesMd: input.notesMd,
  });

  const stamp = fullStamp(ctx, sync);

  if (!existing) {
    const created = await db.company.create({
      data: { folderName, name: input.name ?? folderName, ...facts, ...stamp },
    });
    return {
      id: created.id,
      outcome: await finishWrite({
        entityType: "Company",
        entityId: created.id,
        created: true,
        before: null,
        after: { folderName, name: created.name, ...facts },
        sync,
        ctx,
      }),
    };
  }

  await db.company.update({ where: { id: existing.id }, data: { ...facts, ...stamp } });
  return {
    id: existing.id,
    outcome: await finishWrite({
      entityType: "Company",
      entityId: existing.id,
      created: false,
      before: existing as unknown as Record<string, unknown>,
      after: facts,
      sync,
      ctx,
    }),
  };
}

/** Resolve a empresa a partir da pasta, sem cria-la. */
export async function findCompanyId(folderName: string): Promise<string | null> {
  const key = normalizeKey(folderName, "companyFolderName");
  const row = await db.company.findUnique({ where: { folderName: key }, select: { id: true } });
  return row?.id ?? null;
}

// --------------------------------------------------------------------------
// Skill
// --------------------------------------------------------------------------

export const skillInputSchema = z.object({
  slug: keySchema.describe("CHAVE NATURAL da skill, em minusculas (ex.: 'typescript', 'go', 'postgresql')."),
  name: shortSchema.optional(),
  category: z
    .enum(["language", "framework", "database", "cloud", "practice", "tool"])
    .optional(),
  level: shortSchema.optional().describe("Rotulo DECLARADO no vault. Nunca invente um nivel."),
  yearsUsed: z.number().min(0).max(60).optional(),
  lastUsedYear: z.number().int().min(1990).max(2100).optional(),
  isPrimary: z.boolean().optional(),
  anchorRank: z
    .number()
    .int()
    .min(1)
    .max(99)
    .optional()
    .describe("Menor = mais ancora no CV. Regra R6: TypeScript/Node = 1; Go nunca e ancora (>= 2)."),
  aliases: z.array(shortSchema).max(20).optional(),
});

export type SkillInput = z.infer<typeof skillInputSchema>;

/** Upsert de skills por slug. Devolve os ids, para conectar em Experience/CareerProject. */
export async function upsertSkills(
  inputs: SkillInput[] | undefined,
  ctx: McpToolContext,
  sync: SyncContextInput
): Promise<{ ids: string[]; outcomes: WriteOutcome[] }> {
  const ids: string[] = [];
  const outcomes: WriteOutcome[] = [];
  if (!inputs?.length) return { ids, outcomes };

  for (const input of inputs) {
    const slug = normalizeSlug(input.slug, "skill.slug");
    const facts = omitUndefined({
      name: input.name,
      category: input.category,
      level: input.level,
      yearsUsed: input.yearsUsed,
      lastUsedYear: input.lastUsedYear,
      isPrimary: input.isPrimary,
      anchorRank: input.anchorRank,
      aliases: input.aliases,
    });
    const stamp = seenStamp(ctx, sync);
    const existing = await db.skill.findUnique({ where: { slug } });

    if (!existing) {
      const created = await db.skill.create({
        data: { slug, name: input.name ?? slug, ...facts, ...stamp },
      });
      ids.push(created.id);
      outcomes.push(
        await finishWrite({
          entityType: "Skill",
          entityId: created.id,
          created: true,
          before: null,
          after: { slug, name: created.name, ...facts },
          sync,
          ctx,
        })
      );
      continue;
    }

    await db.skill.update({ where: { id: existing.id }, data: { ...facts, ...stamp } });
    ids.push(existing.id);
    outcomes.push(
      await finishWrite({
        entityType: "Skill",
        entityId: existing.id,
        created: false,
        before: existing as unknown as Record<string, unknown>,
        after: facts,
        sync,
        ctx,
      })
    );
  }

  return { ids, outcomes };
}

// --------------------------------------------------------------------------
// Application / Job — resolucao por chave natural
// --------------------------------------------------------------------------

/** Candidatura pela pasta. Erro de negocio quando nao existe: nunca cria. */
export async function requireApplicationId(folderName: string): Promise<{
  id: string;
  stage: string;
}> {
  const key = normalizeKey(folderName, "folderName");
  const row = await db.application.findUnique({
    where: { folderName: key },
    select: { id: true, stage: true },
  });
  if (!row) {
    throw new McpToolError(
      `Nenhuma candidatura com folderName '${key}'. Crie-a antes com 'upsert_application' — esta tool nunca inventa uma candidatura.`,
      "invalid_arguments"
    );
  }
  return row;
}

export async function findJobId(sourceUrl: string): Promise<string | null> {
  const key = normalizeUrl(sourceUrl, "jobSourceUrl");
  const row = await db.job.findUnique({ where: { sourceUrl: key }, select: { id: true } });
  return row?.id ?? null;
}
