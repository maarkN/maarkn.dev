"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { APPLICATION_SOURCES, APPLICATION_STATUSES } from "@/lib/applications";

export type AppActionState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | { status: "error"; errors: Record<string, string>; message?: string };

const schema = z.object({
  company: z.string().min(1).max(160),
  country: z.string().max(60).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  role: z.string().max(160).optional().or(z.literal("")),
  fit: z.string().max(60).optional().or(z.literal("")),
  source: z.enum(APPLICATION_SOURCES),
  status: z.enum(APPLICATION_STATUSES),
  careersUrl: z.string().url().optional().or(z.literal("")),
  jobUrl: z.string().url().optional().or(z.literal("")),
  sponsorsVisa: z.boolean(),
  targetSalary: z.string().max(200).optional().or(z.literal("")),
  appliedAt: z.string().max(40).optional().or(z.literal("")),
  followUp: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
}

function trim(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function parseForm(fd: FormData) {
  return {
    company: trim(fd.get("company")),
    country: trim(fd.get("country")),
    city: trim(fd.get("city")),
    role: trim(fd.get("role")),
    fit: trim(fd.get("fit")),
    source: trim(fd.get("source")) || "company_site",
    status: trim(fd.get("status")) || "not_applied",
    careersUrl: trim(fd.get("careersUrl")),
    jobUrl: trim(fd.get("jobUrl")),
    sponsorsVisa: fd.get("sponsorsVisa") === "on",
    targetSalary: trim(fd.get("targetSalary")),
    appliedAt: trim(fd.get("appliedAt")),
    followUp: trim(fd.get("followUp")),
    notes: trim(fd.get("notes")),
  };
}

function validate(input: ReturnType<typeof parseForm>): AppActionState | null {
  const result = schema.safeParse(input);
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
function toDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toData(d: ReturnType<typeof parseForm>) {
  return {
    company: d.company,
    country: emptyToNull(d.country),
    city: emptyToNull(d.city),
    role: emptyToNull(d.role),
    fit: emptyToNull(d.fit),
    source: d.source,
    status: d.status,
    careersUrl: emptyToNull(d.careersUrl),
    jobUrl: emptyToNull(d.jobUrl),
    sponsorsVisa: d.sponsorsVisa,
    targetSalary: emptyToNull(d.targetSalary),
    appliedAt: toDate(d.appliedAt),
    followUp: emptyToNull(d.followUp),
    notes: emptyToNull(d.notes),
  };
}

export async function createApplication(
  _prev: AppActionState,
  formData: FormData
): Promise<AppActionState> {
  await requireAdmin();
  if (!dbConfigured) return { status: "error", errors: {}, message: "db_unavailable" };
  const data = parseForm(formData);
  const error = validate(data);
  if (error) return error;
  try {
    await db.jobApplication.create({ data: toData(data) });
  } catch (err) {
    console.error("[admin] create application failed", err);
    return { status: "error", errors: {}, message: "unexpected" };
  }
  revalidatePath("/admin/applications");
  redirect("/admin/applications?created=" + encodeURIComponent(data.company));
}

export async function updateApplication(
  id: string,
  _prev: AppActionState,
  formData: FormData
): Promise<AppActionState> {
  await requireAdmin();
  if (!dbConfigured) return { status: "error", errors: {}, message: "db_unavailable" };
  const data = parseForm(formData);
  const error = validate(data);
  if (error) return error;
  try {
    await db.jobApplication.update({ where: { id }, data: toData(data) });
  } catch (err) {
    console.error("[admin] update application failed", err);
    return { status: "error", errors: {}, message: "unexpected" };
  }
  revalidatePath("/admin/applications");
  redirect("/admin/applications?updated=" + encodeURIComponent(data.company));
}

export async function deleteApplication(id: string): Promise<void> {
  await requireAdmin();
  if (!dbConfigured) return;
  try {
    await db.jobApplication.delete({ where: { id } });
  } catch (err) {
    console.error("[admin] delete application failed", err);
  }
  revalidatePath("/admin/applications");
}
