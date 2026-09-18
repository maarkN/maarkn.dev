"use server";

/**
 * CRUD manual de candidatura sobre o modelo NORMALIZADO
 * (`Application` + `Job` + `Company`). O tracker plano `JobApplication` foi
 * dropado no F2a (migration `20260816170000_application_cutover`).
 *
 * O que muda em relacao a versao antiga, e por que:
 *
 * - **`folderName` e obrigatorio e UNICO.** E a chave natural que o MCP usa
 *   para deduplicar (`upsert_application`). Se a tela criar uma candidatura com
 *   chave diferente da pasta do vault, a proxima sincronizacao cria uma
 *   SEGUNDA linha para a mesma vaga — exatamente o problema que o cutover
 *   resolveu. Por isso o campo e derivado por padrao (`empresa--cargo`) com a
 *   mesma regra da migration e do seed, e a colisao vira erro de campo, nunca
 *   um sufixo silencioso.
 * - **Empresa e entidade, nao string.** O nome digitado e normalizado para o
 *   slug que vira `Company.folderName`; digitar "epilot" duas vezes reaproveita
 *   a mesma empresa.
 * - **A vaga so nasce se houver URL.** `Job.sourceUrl` e chave natural: sem URL
 *   nao ha o que deduplicar, e uma vaga fantasma por candidatura poluiria o
 *   radar. Sem URL, a candidatura fica sem `job` e herda nada.
 * - **`visibility` nao e editavel aqui.** Tudo nasce `private` (default do
 *   schema); promover e acao separada, por humano, com o dado ja na tela.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import {
  APPLICATION_SOURCES,
  FUNNEL_STAGES,
  SPONSORSHIP_SIGNALS,
  buildFolderName,
  slugPart,
} from "@/lib/applications";
import type { ActionResult } from "./action-result";

export type AppActionState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | { status: "error"; errors: Record<string, string>; message?: string };

/**
 * Sentinela do `<Select>` para "herdar da vaga" — o Radix proibe `value=""`.
 * NAO e exportada: um modulo `"use server"` so pode exportar funcao async (o
 * Next transforma cada export em endpoint). O espelho no cliente e o
 * `INHERIT_SPONSORSHIP` de `@/components/admin/application-form`.
 */
const INHERIT = "inherit";

/**
 * URL com esquema em ALLOWLIST. `z.url()` sozinho aceita `javascript:alert(1)`,
 * `data:text/html,…` e `vbscript:` (zod 4.4.3) — e os dois campos abaixo viram
 * `href` nas telas do admin (`/admin/jobs`, dossiê, lista). Mesma trava do
 * `urlSchema` do MCP em `src/lib/mcp/tools/_common.ts`.
 */
const httpUrlSchema = z
  .url({ protocol: /^https?$/, error: "Informe uma URL http(s) válida." })
  .max(2000)
  .refine((value) => /^https?:\/\//i.test(value.trim()), {
    message: "A URL deve começar com http:// ou https://.",
  });

const schema = z.object({
  company: z.string().min(1).max(160),
  roleTitle: z.string().max(160).optional().or(z.literal("")),
  folderName: z
    .string()
    .max(300)
    .regex(
      /^[a-z0-9]+(?:[-.][a-z0-9]+)*(?:--[a-z0-9]+(?:[-.][a-z0-9]+)*)*$/,
      "slug",
    )
    .optional()
    .or(z.literal("")),
  market: z.string().max(60).optional().or(z.literal("")),
  locationText: z.string().max(120).optional().or(z.literal("")),
  stage: z.enum(FUNNEL_STAGES),
  sponsorship: z.enum(SPONSORSHIP_SIGNALS).optional().or(z.literal("")),
  source: z.enum(APPLICATION_SOURCES),
  fit: z.string().max(60).optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(99).optional(),
  careersUrl: httpUrlSchema.optional().or(z.literal("")),
  jobUrl: httpUrlSchema.optional().or(z.literal("")),
  targetSalary: z.string().max(200).optional().or(z.literal("")),
  appliedAt: z.string().max(40).optional().or(z.literal("")),
  followUp: z.string().max(200).optional().or(z.literal("")),
  notesMd: z.string().max(20000).optional().or(z.literal("")),
});

type ApplicationInput = z.infer<typeof schema>;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
}

function trim(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseForm(fd: FormData) {
  const priority = trim(fd.get("priority"));
  const sponsorship = trim(fd.get("sponsorship"));
  return {
    company: trim(fd.get("company")),
    roleTitle: trim(fd.get("roleTitle")),
    folderName: trim(fd.get("folderName")).toLowerCase(),
    market: trim(fd.get("market")),
    locationText: trim(fd.get("locationText")),
    stage: trim(fd.get("stage")) || "radar",
    // O select manda a sentinela quando o usuario escolhe "herdar da vaga".
    sponsorship: sponsorship === INHERIT ? "" : sponsorship,
    source: trim(fd.get("source")) || "company_site",
    fit: trim(fd.get("fit")),
    priority: priority === "" ? undefined : priority,
    careersUrl: trim(fd.get("careersUrl")),
    jobUrl: trim(fd.get("jobUrl")),
    targetSalary: trim(fd.get("targetSalary")),
    appliedAt: trim(fd.get("appliedAt")),
    followUp: trim(fd.get("followUp")),
    notesMd: trim(fd.get("notesMd")),
  };
}

function validate(
  raw: ReturnType<typeof parseForm>,
): { ok: true; data: ApplicationInput } | { ok: false; state: AppActionState } {
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (path && !errors[path]) errors[path] = issue.message;
  }
  return { ok: false, state: { status: "error", errors } };
}

function emptyToNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Empresa por chave natural. Nao sobrescreve dado existente (a linha pode ter
 * vindo do vault, que e a fonte melhor) — so preenche o que esta vazio. */
async function resolveCompanyId(data: ApplicationInput): Promise<string> {
  const folderName = slugPart(data.company);
  const existing = await db.company.findUnique({
    where: { folderName },
    select: { id: true, careersUrl: true, market: true },
  });
  if (!existing) {
    const created = await db.company.create({
      data: {
        folderName,
        name: data.company,
        careersUrl: emptyToNull(data.careersUrl),
        market: emptyToNull(data.market),
        lastMcpTool: "admin:createApplication",
      },
      select: { id: true },
    });
    return created.id;
  }
  const patch: Prisma.CompanyUpdateInput = {};
  if (!existing.careersUrl && data.careersUrl) patch.careersUrl = data.careersUrl;
  if (!existing.market && data.market) patch.market = data.market;
  if (Object.keys(patch).length > 0) {
    await db.company.update({ where: { id: existing.id }, data: patch });
  }
  return existing.id;
}

/** Vaga por `sourceUrl`. `null` quando a candidatura nao tem URL de vaga. */
async function resolveJobId(
  data: ApplicationInput,
  companyId: string,
): Promise<string | null> {
  if (!data.jobUrl) return null;
  const existing = await db.job.findUnique({
    where: { sourceUrl: data.jobUrl },
    select: { id: true },
  });
  if (existing) {
    await db.job.update({
      where: { id: existing.id },
      data: {
        companyId,
        ...(data.roleTitle ? { title: data.roleTitle } : {}),
        ...(data.market ? { market: data.market } : {}),
        ...(data.locationText ? { locationText: data.locationText } : {}),
        ...(data.sponsorship ? { sponsorship: data.sponsorship } : {}),
      },
    });
    return existing.id;
  }
  const created = await db.job.create({
    data: {
      sourceUrl: data.jobUrl,
      companyId,
      title: data.roleTitle || "Cargo a definir",
      market: emptyToNull(data.market),
      locationText: emptyToNull(data.locationText),
      ...(data.sponsorship ? { sponsorship: data.sponsorship } : {}),
      lastMcpTool: "admin:createApplication",
    },
    select: { id: true },
  });
  return created.id;
}

function applicationData(
  data: ApplicationInput,
  ids: { companyId: string; jobId: string | null; folderName: string },
) {
  return {
    folderName: ids.folderName,
    companyId: ids.companyId,
    jobId: ids.jobId,
    stage: data.stage,
    roleTitle: emptyToNull(data.roleTitle),
    market: emptyToNull(data.market),
    sponsorship: data.sponsorship ? data.sponsorship : null,
    source: data.source,
    fit: emptyToNull(data.fit),
    priority: data.priority ?? null,
    appliedAt: toDate(data.appliedAt),
    targetSalary: emptyToNull(data.targetSalary),
    followUp: emptyToNull(data.followUp),
    notesMd: emptyToNull(data.notesMd),
  };
}

/** `P2002` = violacao de UNIQUE. Aqui so `folderName` e `Job.sourceUrl` sao
 * unicos, e os dois sao erro do usuario — nao 500. */
function uniqueViolation(err: unknown): "folderName" | "jobUrl" | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (err.code !== "P2002") return null;
  const target = err.meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target)];
  if (fields.some((field) => field.includes("folderName"))) return "folderName";
  if (fields.some((field) => field.includes("sourceUrl"))) return "jobUrl";
  return "folderName";
}

export async function createApplication(
  _prev: AppActionState,
  formData: FormData,
): Promise<AppActionState> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { status: "error", errors: {}, message: "db_unavailable" };
  }
  const parsed = validate(parseForm(formData));
  if (!parsed.ok) return parsed.state;
  const data = parsed.data;

  const folderName =
    data.folderName ||
    buildFolderName({
      company: data.company,
      roleTitle: data.roleTitle,
      market: data.market,
    });

  try {
    const companyId = await resolveCompanyId(data);
    const jobId = await resolveJobId(data, companyId);
    await db.application.create({
      data: {
        ...applicationData(data, { companyId, jobId, folderName }),
        lastMcpTool: "admin:createApplication",
        lastSeenAt: new Date(),
      },
    });
  } catch (err) {
    const duplicate = uniqueViolation(err);
    if (duplicate) {
      // Codigo estavel, nao frase: quem escreve o texto em pt-BR e a UI
      // (`application-form.tsx`), que ja e dona de todas as mensagens de campo.
      return {
        status: "error",
        errors: { [duplicate]: "duplicate" },
        message: "duplicate",
      };
    }
    console.error("[admin] create application failed", err);
    return { status: "error", errors: {}, message: "unexpected" };
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin");
  redirect("/admin/applications?created=" + encodeURIComponent(folderName));
}

export async function updateApplication(
  id: string,
  _prev: AppActionState,
  formData: FormData,
): Promise<AppActionState> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { status: "error", errors: {}, message: "db_unavailable" };
  }
  const parsed = validate(parseForm(formData));
  if (!parsed.ok) return parsed.state;
  const data = parsed.data;

  const folderName =
    data.folderName ||
    buildFolderName({
      company: data.company,
      roleTitle: data.roleTitle,
      market: data.market,
    });

  try {
    const companyId = await resolveCompanyId(data);
    const jobId = await resolveJobId(data, companyId);
    await db.application.update({
      where: { id },
      data: {
        ...applicationData(data, { companyId, jobId, folderName }),
        // `undefined` = "nao mexe" no Prisma. Sem URL de vaga no formulario, o
        // vinculo anterior e PRESERVADO: gravar `null` aqui descartaria a vaga
        // que a sincronizacao do vault associou, e a tela nao tem como saber se
        // o campo veio vazio por escolha ou porque a URL vive so no vault.
        jobId: jobId ?? undefined,
        lastMcpTool: "admin:updateApplication",
        lastSeenAt: new Date(),
      },
    });
  } catch (err) {
    const duplicate = uniqueViolation(err);
    if (duplicate) {
      // Codigo estavel, nao frase: quem escreve o texto em pt-BR e a UI
      // (`application-form.tsx`), que ja e dona de todas as mensagens de campo.
      return {
        status: "error",
        errors: { [duplicate]: "duplicate" },
        message: "duplicate",
      };
    }
    console.error("[admin] update application failed", err);
    return { status: "error", errors: {}, message: "unexpected" };
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin");
  redirect("/admin/applications?updated=" + encodeURIComponent(folderName));
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." };
  }
  let label: string;
  try {
    // Apaga a candidatura e o que so existe dentro dela (documentos, eventos,
    // checklist — `onDelete: Cascade`). Empresa e vaga SOBREVIVEM: sao
    // entidades proprias, compartilhadas por outras candidaturas.
    const row = await db.application.delete({
      where: { id },
      select: { folderName: true, company: { select: { name: true } } },
    });
    label = row.company?.name ?? row.folderName;
  } catch (err) {
    // A action nao lanca (contrato `ActionResult`, AGENTS.md §2): sem este
    // catch a UI daria toast de sucesso numa exclusao que falhou.
    console.error("[admin] delete application failed", err);
    return { ok: false, message: "Não foi possível excluir a candidatura." };
  }
  revalidatePath("/admin/applications");
  revalidatePath("/admin");
  return { ok: true, message: `Candidatura “${label}” excluída.` };
}
