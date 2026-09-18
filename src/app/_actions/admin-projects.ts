"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { encodeStringList } from "@/lib/json-list";
import type { ActionResult } from "./action-result";

/**
 * Project CRUD for `/admin/projects`.
 *
 * `stackJson`/`featuresJson` stay String-JSON (encoded through
 * `@/lib/json-list`) — migrating those columns to native `String[]` is F1 work,
 * not a presentation refactor. `year` is a String column on purpose too.
 */

const CATEGORIES = ["web", "mobile", "ai", "backend", "client"] as const;
const STATUSES = ["live", "internal", "nda", "archived"] as const;
const VISIBILITIES = ["public", "private"] as const;

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
  repoUrl: z.string().url("URL inválida.").optional().or(z.literal("")),
  demoUrl: z.string().url("URL inválida.").optional().or(z.literal("")),
  caseUrl: z.string().url("URL inválida.").optional().or(z.literal("")),
  tagline: z.string().max(280, "Máximo de 280 caracteres.").optional().or(z.literal("")),
  description: z
    .string()
    .max(8000, "Máximo de 8000 caracteres.")
    .optional()
    .or(z.literal("")),
  role: z.string().max(2000, "Máximo de 2000 caracteres.").optional().or(z.literal("")),
  features: z
    .array(z.string().min(1).max(280))
    .max(20, "No máximo 20 itens."),
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

/** Textareas accept "one per line" or comma-separated. */
function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
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
    features: parseList(trim(formData.get("features"))),
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

function revalidateProjects() {
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
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
    sourceVisibility: data.sourceVisibility,
    coverImage: emptyToNull(data.coverImage ?? ""),
  };

  try {
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
    console.error("[admin] save project failed", err);
    return { ok: false, message: "Não foi possível salvar o projeto." };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." };
  }

  try {
    const row = await db.project.delete({ where: { id } });
    revalidateProjects();
    return { ok: true, message: `Projeto "${row.name}" excluído.` };
  } catch (err) {
    console.error("[admin] delete project failed", err);
    return { ok: false, message: "Não foi possível excluir o projeto." };
  }
}
