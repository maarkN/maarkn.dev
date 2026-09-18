"use server";

/**
 * CRUD de PII DE TERCEIROS: recrutadores (`Contact`) e referências
 * profissionais (`ProfessionalReference`).
 *
 * As duas tabelas têm CHECK no banco forçando `visibility = 'private'`. Este
 * módulo escreve `visibility: "private"` explicitamente na criação — redundante
 * contra o CHECK, e é essa a intenção: quem ler o código não precisa ir até o
 * schema para saber que estas linhas nunca vão para superfície pública. Nenhuma
 * action aqui aceita `visibility` como entrada.
 *
 * Duas regras que valem para os dois formulários:
 *
 * - **Empresa vem de uma lista, não de texto livre.** `companyId` é validado
 *   contra `Company` existente. Aceitar o nome digitado criaria uma empresa a
 *   cada erro de digitação, e `Company` é entidade compartilhada com vagas e
 *   candidaturas.
 * - **Erro nunca é logado com o payload.** Um erro do Prisma pode carregar os
 *   argumentos da consulta — que aqui são o e-mail e o telefone de outra
 *   pessoa. `safeError` deixa passar só nome e código.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { slugPart } from "@/lib/applications";
import type { ActionResult } from "./action-result";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A2 — fora de try/catch
}

/** Só o nome e o código do erro — nunca a mensagem, que pode citar o dado. */
function safeError(err: unknown): string {
  if (err && typeof err === "object") {
    const name = err instanceof Error ? err.name : "Error";
    const code = (err as { code?: unknown }).code;
    return code === undefined ? name : `${name}(${String(code)})`;
  }
  return "erro desconhecido";
}

function trim(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function emptyToNull(value: string | undefined | null): string | null {
  return value && value.length > 0 ? value : null;
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (path && !errors[path]) errors[path] = issue.message;
  }
  return errors;
}

/** Sentinela do `<Select>` (o Radix proíbe `value=""`). Espelhada nos dialogs. */
const NONE = "none";

/**
 * URL de perfil, com esquema em ALLOWLIST.
 *
 * `z.url()` sozinho aceita `javascript:alert(1)`, `data:text/html,…` e
 * `vbscript:` — verificado no zod 4.4.3. Esses valores são gravados e depois
 * renderizados como `href` numa tela do admin; o React 19 hoje neutraliza
 * `javascript:`, mas depender disso é depender de um detalhe do renderer.
 * Mesma trava do `urlSchema` do MCP (`src/lib/mcp/tools/_common.ts`), para que
 * os dois caminhos de escrita concordem sobre o que é uma URL aceitável.
 */
const profileUrlSchema = z
  .url({ protocol: /^https?$/, error: "Informe uma URL http(s) válida." })
  .max(500)
  .refine((value) => /^https?:\/\//i.test(value.trim()), {
    message: "A URL deve começar com http:// ou https://.",
  });

/* ── Contact ──────────────────────────────────────────────────────────────── */

const contactSchema = z.object({
  name: z.string().min(1, "Informe o nome.").max(160),
  roleTitle: z.string().max(160).optional().or(z.literal("")),
  companyId: z.string().max(40).optional().or(z.literal("")),
  email: z.email("E-mail inválido.").max(200).optional().or(z.literal("")),
  phone: z.string().max(60).optional().or(z.literal("")),
  linkedinUrl: profileUrlSchema.optional().or(z.literal("")),
  timezone: z.string().max(60).optional().or(z.literal("")),
  channel: z.string().max(40).optional().or(z.literal("")),
  notesMd: z.string().max(20000).optional().or(z.literal("")),
});

/**
 * `id === null` cria, `id` preenchido edita — um formulário só para os dois
 * casos (§5 do `src/app/admin/AGENTS.md`).
 */
export async function saveContact(
  id: string | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." }; // A3
  }

  const channel = trim(formData.get("channel"));
  const companyId = trim(formData.get("companyId"));
  const parsed = contactSchema.safeParse({
    name: trim(formData.get("name")),
    roleTitle: trim(formData.get("roleTitle")),
    companyId: companyId === NONE ? "" : companyId,
    email: trim(formData.get("email")),
    phone: trim(formData.get("phone")),
    linkedinUrl: trim(formData.get("linkedinUrl")),
    timezone: trim(formData.get("timezone")),
    channel: channel === NONE ? "" : channel,
    notesMd: trim(formData.get("notesMd")),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const data = parsed.data;

  try {
    // A empresa precisa existir: o `<Select>` só oferece as que existem, mas o
    // FormData é do cliente e chega como qualquer outro dado não confiável.
    if (data.companyId) {
      const company = await db.company.findUnique({
        where: { id: data.companyId },
        select: { id: true },
      });
      if (!company) {
        return {
          ok: false,
          message: "Confira os campos destacados.",
          fieldErrors: { companyId: "Empresa não encontrada." },
        };
      }
    }

    const facts = {
      name: data.name,
      roleTitle: emptyToNull(data.roleTitle),
      companyId: emptyToNull(data.companyId),
      email: emptyToNull(data.email),
      phone: emptyToNull(data.phone),
      linkedinUrl: emptyToNull(data.linkedinUrl),
      timezone: emptyToNull(data.timezone),
      channel: emptyToNull(data.channel),
      notesMd: emptyToNull(data.notesMd),
    };

    const row = id
      ? await db.contact.update({
          where: { id },
          data: { ...facts, lastMcpTool: "admin:saveContact" },
          select: { id: true },
        })
      : await db.contact.create({
          data: {
            ...facts,
            // Redundante contra o CHECK do banco, e deliberado: PII de terceiro
            // nasce privada, sempre.
            visibility: "private",
            lastMcpTool: "admin:saveContact",
            lastSeenAt: new Date(),
          },
          select: { id: true },
        });

    revalidatePath("/admin/contacts");
    return {
      ok: true,
      data: { id: row.id },
      message: id ? "Contato atualizado." : "Contato criado.",
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // `@@unique([companyId, name])` (+ os índices parciais da migration
      // `backoffice_dedupe_holes` para contato sem empresa).
      return {
        ok: false,
        message: "Confira os campos destacados.",
        fieldErrors: { name: "Já existe um contato com esse nome nesta empresa." },
      };
    }
    console.error("[admin] save contact failed", safeError(err));
    return { ok: false, message: "Não foi possível salvar o contato." };
  }
}

export async function deleteContact(id: string): Promise<ActionResult> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." };
  }
  try {
    // Eventos e entrevistas SOBREVIVEM com `contactId = NULL` (`onDelete:
    // SetNull` no schema): a linha do tempo da candidatura não pode sumir
    // porque um contato foi apagado.
    await db.contact.delete({ where: { id } });
  } catch (err) {
    console.error("[admin] delete contact failed", safeError(err));
    return { ok: false, message: "Não foi possível excluir o contato." };
  }
  revalidatePath("/admin/contacts");
  return { ok: true, message: "Contato excluído." };
}

/* ── ProfessionalReference ────────────────────────────────────────────────── */

const referenceSchema = z.object({
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/, "Use apenas letras, números e hífen.")
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, "Informe o nome.").max(160),
  relationship: z.string().max(160).optional().or(z.literal("")),
  companyName: z.string().max(160).optional().or(z.literal("")),
  roleTitle: z.string().max(160).optional().or(z.literal("")),
  email: z.email("E-mail inválido.").max(200).optional().or(z.literal("")),
  phone: z.string().max(60).optional().or(z.literal("")),
  linkedinUrl: profileUrlSchema.optional().or(z.literal("")),
  language: z.string().max(20).optional().or(z.literal("")),
  noteMd: z.string().max(20000).optional().or(z.literal("")),
});

export async function saveProfessionalReference(
  id: string | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." }; // A3
  }

  const language = trim(formData.get("language"));
  const parsed = referenceSchema.safeParse({
    slug: trim(formData.get("slug")).toLowerCase(),
    name: trim(formData.get("name")),
    relationship: trim(formData.get("relationship")),
    companyName: trim(formData.get("companyName")),
    roleTitle: trim(formData.get("roleTitle")),
    email: trim(formData.get("email")),
    phone: trim(formData.get("phone")),
    linkedinUrl: trim(formData.get("linkedinUrl")),
    language: language === NONE ? "" : language,
    noteMd: trim(formData.get("noteMd")),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const data = parsed.data;
  // `canContact` é checkbox: ausente no FormData significa desmarcado.
  const canContact = trim(formData.get("canContact")) === "on";
  // `slug` é a CHAVE NATURAL de sync — deriva do nome quando em branco, com a
  // mesma regra de slug do resto do sistema, para o dia em que uma tool de MCP
  // escrever aqui.
  const slug = data.slug || slugPart(data.name);

  try {
    const facts = {
      name: data.name,
      relationship: emptyToNull(data.relationship),
      companyName: emptyToNull(data.companyName),
      roleTitle: emptyToNull(data.roleTitle),
      email: emptyToNull(data.email),
      phone: emptyToNull(data.phone),
      linkedinUrl: emptyToNull(data.linkedinUrl),
      language: emptyToNull(data.language),
      canContact,
      noteMd: emptyToNull(data.noteMd),
    };

    const row = id
      ? await db.professionalReference.update({
          where: { id },
          data: { ...facts, slug, lastMcpTool: "admin:saveProfessionalReference" },
          select: { id: true },
        })
      : await db.professionalReference.create({
          data: {
            ...facts,
            slug,
            visibility: "private",
            lastMcpTool: "admin:saveProfessionalReference",
            lastSeenAt: new Date(),
          },
          select: { id: true },
        });

    revalidatePath("/admin/contacts");
    return {
      ok: true,
      data: { id: row.id },
      message: id ? "Referência atualizada." : "Referência criada.",
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        ok: false,
        message: "Confira os campos destacados.",
        fieldErrors: { slug: `A chave “${slug}” já está em uso.` },
      };
    }
    console.error("[admin] save professional reference failed", safeError(err));
    return { ok: false, message: "Não foi possível salvar a referência." };
  }
}

export async function deleteProfessionalReference(
  id: string,
): Promise<ActionResult> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." };
  }
  try {
    await db.professionalReference.delete({ where: { id } });
  } catch (err) {
    console.error("[admin] delete professional reference failed", safeError(err));
    return { ok: false, message: "Não foi possível excluir a referência." };
  }
  revalidatePath("/admin/contacts");
  return { ok: true, message: "Referência excluída." };
}
