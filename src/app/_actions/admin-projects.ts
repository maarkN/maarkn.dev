"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { locales } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { safeDbError } from "@/lib/safe-error";
import { getAdminLabels } from "@/lib/admin/request";
import { fill } from "@/lib/admin/text";
import { httpUrlSchema } from "@/lib/http-url";
import { encodeStringList } from "@/lib/json-list";
import { MAX_SUCCESS_CASES } from "@/lib/project-text";
import { terminalHref } from "@/lib/terminal/address";
import type { ActionResult } from "./action-result";

/**
 * Project CRUD for `/admin/projects`.
 *
 * `stackJson`/`featuresJson` stay String-JSON (encoded through
 * `@/lib/json-list`) — migrating those columns to native `String[]` is F1 work,
 * not a presentation refactor. `year` is a String column on purpose too.
 *
 * What is saved here is what the public site shows, in each language (ADR 0003).
 */

const CATEGORIES = ["web", "mobile", "ai", "backend", "client"] as const;
const STATUSES = ["live", "internal", "nda", "archived"] as const;
const VISIBILITIES = ["public", "private"] as const;
/** Espelho da sentinela do `<Select>` de caso: o Radix proíbe `value=""`. */
const NO_CASE = "none";

const tagline = z.string().max(280, "Máximo de 280 caracteres.").optional().or(z.literal(""));
const description = z
  .string()
  .max(8000, "Máximo de 8000 caracteres.")
  .optional()
  .or(z.literal(""));
const paragraph = z.string().max(2000, "Máximo de 2000 caracteres.").optional().or(z.literal(""));
const features = z
  .array(z.string().min(1).max(280, "Máximo de 280 caracteres por item."))
  .max(20, "No máximo 20 itens.");

const projectSchema = z.object({
  slug: z
    .string()
    .min(2, "Mínimo de 2 caracteres.")
    .max(80, "Máximo de 80 caracteres.")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens."),
  name: z
    .string()
    .min(2, "Informe o nome do projeto.")
    .max(120, "Máximo de 120 caracteres."),
  year: z
    .string()
    .min(2, "Informe o ano.")
    .max(40, "Máximo de 40 caracteres."),
  category: z.enum(CATEGORIES, { message: "Selecione uma categoria válida." }),
  status: z.enum(STATUSES, { message: "Selecione um status válido." }),
  featured: z.boolean(),
  monogram: z
    .string()
    .min(1, "Informe o monograma.")
    .max(4, "No máximo 4 caracteres."),
  accentFrom: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use um hexadecimal como #4f6ef7."),
  accentTo: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use um hexadecimal como #22d3ee."),
  stack: z
    .array(z.string().min(1).max(40))
    .min(1, "Informe ao menos um item da stack.")
    .max(20, "No máximo 20 itens."),
  // `z.string().url()` aceitava `javascript:`, `data:text/html,…` e
  // `vbscript:`, e estes tres campos viram `href` no site PUBLICO
  // (`/[lang]/projects/[slug]`). `httpUrlSchema` e a mesma trava do
  // `urlSchema` do MCP e dos `_actions/applications.ts`/`contacts.ts`; o
  // render tem a sua propria (ver `httpHref` em `@/lib/projects-repo`).
  repoUrl: httpUrlSchema.optional().or(z.literal("")),
  demoUrl: httpUrlSchema.optional().or(z.literal("")),
  caseUrl: httpUrlSchema.optional().or(z.literal("")),
  // Sem sufixo é o texto em inglês, como nas colunas.
  tagline,
  taglinePt: tagline,
  description,
  descriptionPt: description,
  role: paragraph,
  rolePt: paragraph,
  features,
  featuresPt: features,
  caseProblemPt: paragraph,
  caseProblemEn: paragraph,
  caseWorkPt: paragraph,
  caseWorkEn: paragraph,
  caseResultPt: paragraph,
  caseResultEn: paragraph,
  /** Posição entre os casos de sucesso; `null` quando não é caso. */
  casePosition: z
    .number({ message: "Selecione uma posição válida." })
    .int("Selecione uma posição válida.")
    .min(1, "Selecione uma posição válida.")
    .max(MAX_SUCCESS_CASES, "Selecione uma posição válida.")
    .nullable(),
  sourceVisibility: z.enum(VISIBILITIES, {
    message: "Selecione a visibilidade do código-fonte.",
  }),
  coverImage: z.string().max(400).optional().or(z.literal("")),
});

/** A2 — every action starts here. `redirect` throws, so it stays out of try/catch. */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}

function trim(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

/** Short labels: "one per line" or comma-separated. */
function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Sentences: one per line only, because a sentence has commas of its own. */
function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** `""` and the select's sentinel mean "not a case"; the rest is for zod. */
function parsePosition(value: string): number | null {
  return value === "" || value === NO_CASE ? null : Number(value);
}

function parseForm(formData: FormData) {
  const featured = trim(formData.get("featured"));
  return {
    slug: trim(formData.get("slug")).toLowerCase(),
    name: trim(formData.get("name")),
    year: trim(formData.get("year")),
    category: trim(formData.get("category")),
    status: trim(formData.get("status")) || "live",
    featured: featured === "on" || featured === "true",
    monogram: trim(formData.get("monogram")).toUpperCase(),
    accentFrom: trim(formData.get("accentFrom")),
    accentTo: trim(formData.get("accentTo")),
    stack: parseList(trim(formData.get("stack"))),
    repoUrl: trim(formData.get("repoUrl")),
    demoUrl: trim(formData.get("demoUrl")),
    caseUrl: trim(formData.get("caseUrl")),
    tagline: trim(formData.get("tagline")),
    description: trim(formData.get("description")),
    role: trim(formData.get("role")),
    features: parseLines(trim(formData.get("features"))),
    taglinePt: trim(formData.get("taglinePt")),
    descriptionPt: trim(formData.get("descriptionPt")),
    rolePt: trim(formData.get("rolePt")),
    featuresPt: parseLines(trim(formData.get("featuresPt"))),
    caseProblemPt: trim(formData.get("caseProblemPt")),
    caseProblemEn: trim(formData.get("caseProblemEn")),
    caseWorkPt: trim(formData.get("caseWorkPt")),
    caseWorkEn: trim(formData.get("caseWorkEn")),
    caseResultPt: trim(formData.get("caseResultPt")),
    caseResultEn: trim(formData.get("caseResultEn")),
    casePosition: parsePosition(trim(formData.get("casePosition"))),
    sourceVisibility: trim(formData.get("sourceVisibility")) || "public",
    coverImage: trim(formData.get("coverImage")),
  };
}

function emptyToNull(v: string) {
  return v.length > 0 ? v : null;
}

function isUniqueViolation(err: unknown, field: string): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; meta?: { target?: string[] } };
  return e.code === "P2002" && (e.meta?.target?.includes(field) ?? false);
}

/**
 * The public listing and the detail render per request; the CLI version (where
 * the `projects` command reads from), the home and the sitemap are cached for
 * an hour. Pages are revalidated by their literal path, one per language: their
 * route patterns carry route groups.
 */
function revalidateProjects() {
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
  for (const lang of locales) {
    revalidatePath(`/${lang}`);
    revalidatePath(terminalHref(lang));
  }
  revalidatePath("/sitemap.xml");
}

/* ── casos de sucesso ────────────────────────────────────────────────────── */

const CASE_FIELDS = {
  caseProblemPt: "problema (PT)",
  caseProblemEn: "problema (EN)",
  caseWorkPt: "trabalho (PT)",
  caseWorkEn: "trabalho (EN)",
  caseResultPt: "resultado (PT)",
  caseResultEn: "resultado (EN)",
} as const;

type CaseField = keyof typeof CASE_FIELDS;
type Refusal = { message: string; fieldErrors: Record<string, string> };

const refuse = (fieldErrors: Record<string, string>, message: string): Refusal => ({
  message,
  fieldErrors,
});

/** Um caso conta problema, trabalho e resultado nos dois idiomas. */
function refuseCaseWithoutText(data: Partial<Record<CaseField, string>>): Refusal | null {
  const missing = (Object.keys(CASE_FIELDS) as CaseField[]).filter((field) => !data[field]);
  if (missing.length === 0) return null;
  const message = `Para ser caso de sucesso, falta: ${missing
    .map((field) => CASE_FIELDS[field])
    .join(", ")}.`;
  return refuse(
    {
      casePosition: message,
      ...Object.fromEntries(missing.map((field) => [field, "Obrigatório em um caso de sucesso."])),
    },
    message,
  );
}

/** No máximo três casos, e uma posição é de um só. */
async function refuseTakenCase(id: string | null, position: number): Promise<Refusal | null> {
  const others = await db.project.findMany({
    where: { casePosition: { not: null }, ...(id ? { id: { not: id } } : {}) },
    select: { name: true, casePosition: true },
    orderBy: { casePosition: "asc" },
  });
  if (others.length >= MAX_SUCCESS_CASES) {
    const message = `Já há ${MAX_SUCCESS_CASES} casos de sucesso (${others
      .map((p) => p.name)
      .join(", ")}). Desmarque um antes de marcar outro.`;
    return refuse({ casePosition: message }, message);
  }
  const owner = others.find((p) => p.casePosition === position);
  if (!owner) return null;
  const message = `A posição ${position} já é de ${owner.name}. Escolha outra ou desmarque-o.`;
  return refuse({ casePosition: message }, message);
}

/**
 * Create (id === null) or update (id set). Returns `ActionResult` instead of
 * redirecting: an action that redirects never returns, so the client could not
 * show a toast. Navigation is the caller's job.
 */
export async function saveProject(
  id: string | null,
  formData: FormData,
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." };
  }

  const parsed = projectSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Confira os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  const row = {
    slug: data.slug,
    name: data.name,
    year: data.year,
    category: data.category,
    status: data.status,
    featured: data.featured,
    monogram: data.monogram,
    accentFrom: data.accentFrom,
    accentTo: data.accentTo,
    stackJson: encodeStringList(data.stack),
    // A private project never keeps a repo link, even if one was typed before
    // the visibility flipped.
    repoUrl:
      data.sourceVisibility === "private" ? null : emptyToNull(data.repoUrl ?? ""),
    demoUrl: emptyToNull(data.demoUrl ?? ""),
    caseUrl: emptyToNull(data.caseUrl ?? ""),
    tagline: emptyToNull(data.tagline ?? ""),
    description: emptyToNull(data.description ?? ""),
    role: emptyToNull(data.role ?? ""),
    featuresJson: encodeStringList(data.features),
    taglinePt: emptyToNull(data.taglinePt ?? ""),
    descriptionPt: emptyToNull(data.descriptionPt ?? ""),
    rolePt: emptyToNull(data.rolePt ?? ""),
    featuresPtJson: encodeStringList(data.featuresPt),
    caseProblemPt: emptyToNull(data.caseProblemPt ?? ""),
    caseProblemEn: emptyToNull(data.caseProblemEn ?? ""),
    caseWorkPt: emptyToNull(data.caseWorkPt ?? ""),
    caseWorkEn: emptyToNull(data.caseWorkEn ?? ""),
    caseResultPt: emptyToNull(data.caseResultPt ?? ""),
    caseResultEn: emptyToNull(data.caseResultEn ?? ""),
    casePosition: data.casePosition,
    sourceVisibility: data.sourceVisibility,
    coverImage: emptyToNull(data.coverImage ?? ""),
  };

  try {
    if (data.casePosition !== null) {
      const refusal =
        refuseCaseWithoutText(data) ?? (await refuseTakenCase(id, data.casePosition));
      if (refusal) return { ok: false, ...refusal };
    }

    const saved = id
      ? await db.project.update({ where: { id }, data: row })
      : await db.project.create({ data: row });

    revalidateProjects();
    return {
      ok: true,
      data: { id: saved.id, slug: saved.slug },
      message: id ? "Projeto atualizado." : "Projeto criado.",
    };
  } catch (err) {
    if (isUniqueViolation(err, "slug")) {
      return {
        ok: false,
        message: "Já existe um projeto com esse slug.",
        fieldErrors: { slug: "Slug já utilizado." },
      };
    }
    // Duas gravações ao mesmo tempo passam pela leitura acima; o banco não deixa.
    if (isUniqueViolation(err, "casePosition")) {
      const message = "Outro projeto acabou de ocupar essa posição. Recarregue e tente de novo.";
      return { ok: false, message, fieldErrors: { casePosition: message } };
    }
    console.error("[admin] save project failed", err);
    return { ok: false, message: "Não foi possível salvar o projeto." };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await requireAdmin();
  // The list of projects is translated: its notices speak its language (A4).
  const { projects, common } = await getAdminLabels();
  if (!dbConfigured) {
    return { ok: false, message: common.noDatabase };
  }

  try {
    const row = await db.project.delete({ where: { id }, select: { name: true } });
    revalidateProjects();
    return { ok: true, message: fill(projects.delete.done, { name: row.name }) };
  } catch (err) {
    console.error("[admin] delete project failed", safeDbError(err));
    return { ok: false, message: projects.delete.failed };
  }
}
