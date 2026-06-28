"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { encodeStringList } from "@/lib/json-list";

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | { status: "error"; errors: Record<string, string>; message?: string };

const projectSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, "slug_format"),
  name: z.string().min(2).max(120),
  year: z.string().min(2).max(40),
  category: z.enum(["web", "mobile", "ai", "backend", "client"]),
  status: z.enum(["live", "internal", "nda", "archived"]),
  featured: z.boolean(),
  monogram: z.string().min(1).max(4),
  accentFrom: z.string().regex(/^#[0-9a-fA-F]{6}$/, "color"),
  accentTo: z.string().regex(/^#[0-9a-fA-F]{6}$/, "color"),
  stack: z.array(z.string().min(1).max(40)).min(1).max(20),
  repoUrl: z.string().url().optional().or(z.literal("")),
  demoUrl: z.string().url().optional().or(z.literal("")),
  caseUrl: z.string().url().optional().or(z.literal("")),
  tagline: z.string().max(280).optional().or(z.literal("")),
  description: z.string().max(8000).optional().or(z.literal("")),
  role: z.string().max(2000).optional().or(z.literal("")),
  features: z.array(z.string().min(1).max(280)).max(20),
  sourceVisibility: z.enum(["public", "private"]),
  coverImage: z.string().max(400).optional().or(z.literal("")),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}

function trim(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseForm(formData: FormData) {
  return {
    slug: trim(formData.get("slug")).toLowerCase(),
    name: trim(formData.get("name")),
    year: trim(formData.get("year")),
    category: trim(formData.get("category")),
    status: trim(formData.get("status")) || "live",
    featured: formData.get("featured") === "on",
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
    sourceVisibility: (trim(formData.get("sourceVisibility")) || "public") as
      | "public"
      | "private",
    coverImage: trim(formData.get("coverImage")),
  };
}

function validate(input: ReturnType<typeof parseForm>): ActionState | null {
  const result = projectSchema.safeParse(input);
  if (result.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (path && !errors[path]) errors[path] = issue.message;
  }
  return { status: "error", errors };
}

function emptyToNull(v: string) {
  return v.length > 0 ? v : null;
}

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!dbConfigured) return { status: "error", errors: {}, message: "db_unavailable" };

  const data = parseForm(formData);
  const error = validate(data);
  if (error) return error;

  try {
    await db.project.create({
      data: {
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
        repoUrl: data.sourceVisibility === "private" ? null : emptyToNull(data.repoUrl),
        demoUrl: emptyToNull(data.demoUrl),
        caseUrl: emptyToNull(data.caseUrl),
        tagline: emptyToNull(data.tagline),
        description: emptyToNull(data.description),
        role: emptyToNull(data.role),
        featuresJson: encodeStringList(data.features),
        sourceVisibility: data.sourceVisibility,
        coverImage: emptyToNull(data.coverImage),
      },
    });
  } catch (err) {
    if (isUniqueViolation(err, "slug")) {
      return { status: "error", errors: { slug: "slug_taken" } };
    }
    console.error("[admin] create project failed", err);
    return { status: "error", errors: {}, message: "unexpected" };
  }

  revalidatePath("/admin");
  redirect("/admin?created=" + data.slug);
}

export async function updateProject(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  if (!dbConfigured) return { status: "error", errors: {}, message: "db_unavailable" };

  const data = parseForm(formData);
  const error = validate(data);
  if (error) return error;

  try {
    await db.project.update({
      where: { id },
      data: {
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
        repoUrl: data.sourceVisibility === "private" ? null : emptyToNull(data.repoUrl),
        demoUrl: emptyToNull(data.demoUrl),
        caseUrl: emptyToNull(data.caseUrl),
        tagline: emptyToNull(data.tagline),
        description: emptyToNull(data.description),
        role: emptyToNull(data.role),
        featuresJson: encodeStringList(data.features),
        sourceVisibility: data.sourceVisibility,
        coverImage: emptyToNull(data.coverImage),
      },
    });
  } catch (err) {
    if (isUniqueViolation(err, "slug")) {
      return { status: "error", errors: { slug: "slug_taken" } };
    }
    console.error("[admin] update project failed", err);
    return { status: "error", errors: {}, message: "unexpected" };
  }

  revalidatePath("/admin");
  redirect("/admin?updated=" + data.slug);
}

export async function deleteProject(id: string): Promise<void> {
  await requireAdmin();
  if (!dbConfigured) return;
  try {
    await db.project.delete({ where: { id } });
  } catch (err) {
    console.error("[admin] delete project failed", err);
  }
  revalidatePath("/admin");
}

function isUniqueViolation(err: unknown, field: string): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; meta?: { target?: string[] } };
  return e.code === "P2002" && (e.meta?.target?.includes(field) ?? false);
}
