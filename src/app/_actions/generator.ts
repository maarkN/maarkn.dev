"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { generateApplication } from "@/lib/generator";

export type GenState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      id: string;
      resume: string;
      coverLetter: string;
      screeningAnswers: string;
      sources: string[];
    };

const schema = z.object({
  jobDescription: z.string().min(40).max(20000),
  language: z.enum(["en", "pt-BR"]),
  company: z.string().max(160).optional(),
  roleTitle: z.string().max(160).optional(),
});

export async function generate(_prev: GenState, formData: FormData): Promise<GenState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "unauthorized" };
  if (!dbConfigured) return { status: "error", message: "db_unavailable" };

  const input = {
    jobDescription: String(formData.get("jobDescription") ?? "").trim(),
    language: String(formData.get("language") ?? "en") as "en" | "pt-BR",
    company: String(formData.get("company") ?? "").trim() || undefined,
    roleTitle: String(formData.get("roleTitle") ?? "").trim() || undefined,
  };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Paste a fuller job description (40+ characters)." };
  }

  let out;
  try {
    out = await generateApplication(parsed.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    console.error("[generator] failed:", msg);
    if (msg === "no_api_key")
      return { status: "error", message: "OPENAI_API_KEY is not set on the server." };
    if (msg === "no_context")
      return { status: "error", message: "Knowledge base is empty — run `npm run db:ingest`." };
    return { status: "error", message: "Generation failed. Check the server logs and try again." };
  }

  let id = "";
  try {
    const rec = await db.generation.create({
      data: {
        company: parsed.data.company ?? null,
        roleTitle: parsed.data.roleTitle ?? null,
        language: parsed.data.language,
        jobDescription: parsed.data.jobDescription,
        resume: out.resume,
        coverLetter: out.coverLetter,
        screeningAnswers: out.screeningAnswers,
        sourcesJson: JSON.stringify(out.sources),
      },
    });
    id = rec.id;
    revalidatePath("/admin/generator");
  } catch (err) {
    console.error("[generator] save failed", err);
  }

  return {
    status: "success",
    id,
    resume: out.resume,
    coverLetter: out.coverLetter,
    screeningAnswers: out.screeningAnswers,
    sources: out.sources,
  };
}
