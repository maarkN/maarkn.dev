"use server";

/**
 * Ações do DOSSIÊ de uma candidatura — as três decisões que se toma com o
 * registro aberto na frente, sem sair da página:
 *
 *   1. `moveApplicationStage`      — mover o funil (e deixar rastro disso);
 *   2. `logApplicationEvent`       — registrar o que aconteceu;
 *   3. `updateApplicationKeyFields`— corrigir os campos de decisão;
 *   4. `setChecklistItemDone`      — marcar item do pacote.
 *
 * ── Por que este arquivo existe, se já há `src/app/_actions/applications.ts` ─
 * Aquele arquivo é o CRUD do formulário de página inteira: valida o cadastro
 * completo (empresa, `folderName`, URL da vaga), usa `AppActionState` +
 * `useActionState` e **redireciona** no sucesso. Uma tela de detalhe precisa do
 * oposto: escrita pontual, sem navegação, com `toast` — ou seja, o contrato
 * `ActionResult` do §2 do `AGENTS.md`. Misturar os dois no mesmo módulo
 * obrigaria cada chamador a saber qual metade se aplica a ele.
 *
 * Divisão de responsabilidade, para não haver dois donos do mesmo campo:
 * - CHAVES E VÍNCULOS (`folderName`, empresa, `Job.sourceUrl`) → só pelo
 *   formulário completo em `/admin/applications/[id]/edit`. São chave natural
 *   de dedupe do MCP; mudá-las por um dialog lateral é como o vault ganha uma
 *   linha duplicada na próxima sincronização.
 * - ESTÁGIO → só por `moveApplicationStage`, que grava o `ApplicationEvent`
 *   correspondente. É por isso que `stage` **não** está no schema de
 *   `updateApplicationKeyFields`: um caminho alternativo de escrita produziria
 *   transição sem evento, e a timeline deixaria de ser confiável.
 * - O RESTO (mercado, prioridade, origem, patrocínio, datas, notas) → aqui.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import {
  FUNNEL_STAGE_LABELS,
  SPONSORSHIP_SIGNALS,
  isFunnelStage,
} from "@/lib/applications";
import type { ActionResult } from "@/app/_actions/action-result";

/**
 * Sentinelas do `<Select>` (o Radix proíbe `value=""`). NÃO são exportadas: um
 * módulo `"use server"` só pode exportar função async — o Next transforma cada
 * export em endpoint. O espelho no cliente vive em
 * `@/components/admin/application-detail/key-fields-dialog`.
 */
const INHERIT = "inherit";
const NONE = "none";

/** Marca de autoria das escritas feitas pela UI, no mesmo formato que
 *  `src/app/_actions/applications.ts` já usa (`admin:<ação>`). Serve para
 *  distinguir, numa linha, o que veio do vault do que foi decidido na tela. */
const TOOL = {
  stage: "admin:moveApplicationStage",
  event: "admin:logApplicationEvent",
  fields: "admin:updateApplicationKeyFields",
  checklist: "admin:setChecklistItemDone",
} as const;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A2 — fora de try/catch
}

/** Revalida a página do dossiê + tudo que mostra a candidatura em lista. */
function revalidateApplication(id: string) {
  revalidatePath(`/admin/applications/${id}`);
  revalidatePath("/admin/applications");
  revalidatePath("/admin");
}

function trim(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function emptyToNull(value: string | undefined | null): string | null {
  return value && value.length > 0 ? value : null;
}

/** Erros de campo do zod no formato `{ campo: mensagem }` do `ActionResult`. */
function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/* ── 1. mover o estágio ───────────────────────────────────────────────────── */

/**
 * Move o funil e grava o `ApplicationEvent` de transição na MESMA transação.
 *
 * A transação não é zelo abstrato: sem ela, uma falha entre o `update` e o
 * `create` deixaria a candidatura num estágio que a timeline não explica — e a
 * timeline é a única fonte de "quando isso mudou", já que `Application` não
 * versiona `stage`.
 *
 * O evento sai com `sourceKey` nulo de propósito. Essa coluna é a chave de
 * idempotência do MCP (`"epilot#event#3"`); um evento nascido na UI não tem
 * correspondente no vault, e inventar uma chave faria a próxima sincronização
 * acreditar que este evento veio de um arquivo.
 */
export async function moveApplicationStage(
  id: string,
  stage: string,
): Promise<ActionResult> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." };
  }
  if (!isFunnelStage(stage)) {
    return { ok: false, message: "Estágio inválido." };
  }

  try {
    const current = await db.application.findUnique({
      where: { id },
      select: { stage: true },
    });
    if (!current) {
      return { ok: false, message: "Candidatura não encontrada." };
    }
    if (current.stage === stage) {
      return {
        ok: false,
        message: `A candidatura já está em “${FUNNEL_STAGE_LABELS[stage]}”.`,
      };
    }

    await db.$transaction([
      db.application.update({
        where: { id },
        data: { stage, lastMcpTool: TOOL.stage, lastSeenAt: new Date() },
      }),
      db.applicationEvent.create({
        data: {
          applicationId: id,
          type: "stage_change",
          fromStage: current.stage,
          toStage: stage,
          lastMcpTool: TOOL.stage,
        },
      }),
    ]);
  } catch (err) {
    console.error("[admin] move application stage failed", err);
    return { ok: false, message: "Não foi possível mover o estágio." };
  }

  revalidateApplication(id);
  return {
    ok: true,
    message: `Estágio movido para “${FUNNEL_STAGE_LABELS[stage]}”. Evento registrado na timeline.`,
  };
}

/* ── 2. registrar um evento ───────────────────────────────────────────────── */

const eventSchema = z.object({
  type: z.string().min(1, "Informe o tipo do evento.").max(60),
  direction: z.enum(["inbound", "outbound"]).optional().or(z.literal("")),
  channel: z.string().max(40).optional().or(z.literal("")),
  subject: z.string().max(300).optional().or(z.literal("")),
  bodyMd: z.string().max(20000).optional().or(z.literal("")),
  contactId: z.string().max(64).optional().or(z.literal("")),
  /** ISO completo, montado no cliente a partir de um `datetime-local`. */
  occurredAt: z.string().max(40).optional().or(z.literal("")),
});

/**
 * `occurredAt` chega como ISO **com offset**, convertido no cliente. O motivo
 * está no §A5 do `AGENTS.md`: um `datetime-local` cru ("2026-08-16T14:30") é
 * hora LOCAL, e interpretá-lo aqui usaria o fuso do servidor (UTC no
 * contêiner), deslocando todo evento em 3 horas. Vazio = agora.
 */
export async function logApplicationEvent(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." };
  }

  const parsed = eventSchema.safeParse({
    type: trim(formData.get("type")),
    direction: trim(formData.get("direction")),
    channel: trim(formData.get("channel")),
    subject: trim(formData.get("subject")),
    bodyMd: trim(formData.get("bodyMd")),
    contactId: trim(formData.get("contactId")),
    occurredAt: trim(formData.get("occurredAt")),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const data = parsed.data;

  const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: { occurredAt: "Data inválida." },
    };
  }

  try {
    // O contato precisa ser DESTA candidatura. A tela só oferece os certos, mas
    // a validação que vale é a daqui — quem chama a action pode não ser a tela
    // (é o mesmo raciocínio do `revokeApiKey`, §6 do AGENTS.md). Sem isto, um
    // payload forjado penduraria um recrutador de outra empresa nesta timeline.
    if (data.contactId) {
      const contact = await db.contact.findFirst({
        where: { id: data.contactId, applicationId: id },
        select: { id: true },
      });
      if (!contact) {
        return {
          ok: false,
          message: "Confira os campos destacados.",
          fieldErrors: { contactId: "Contato inválido para esta candidatura." },
        };
      }
    }

    await db.applicationEvent.create({
      data: {
        applicationId: id,
        occurredAt,
        type: data.type,
        direction: data.direction ? data.direction : null,
        channel: emptyToNull(data.channel),
        subject: emptyToNull(data.subject),
        bodyMd: emptyToNull(data.bodyMd),
        contactId: emptyToNull(data.contactId),
        lastMcpTool: TOOL.event,
      },
    });
  } catch (err) {
    // Inclui o caso de `applicationId` inexistente (violação de FK) — que é
    // erro de rota, não 500.
    console.error("[admin] log application event failed", err);
    return { ok: false, message: "Não foi possível registrar o evento." };
  }

  revalidateApplication(id);
  return { ok: true, message: "Evento registrado na timeline." };
}

/* ── 3. editar os campos-chave ────────────────────────────────────────────── */

const fieldsSchema = z.object({
  roleTitle: z.string().max(160).optional().or(z.literal("")),
  market: z.string().max(60).optional().or(z.literal("")),
  // Texto livre no banco: o MCP pode ter gravado uma origem fora da lista
  // curada de `APPLICATION_SOURCES`, e um `z.enum` aqui apagaria esse valor.
  source: z.string().max(40).optional().or(z.literal("")),
  sponsorship: z.enum(SPONSORSHIP_SIGNALS).optional().or(z.literal("")),
  // Mensagens em pt-BR (A4): este é o ÚNICO campo cujo erro de validação chega
  // ao usuário na prática — os demais são limitados por `maxLength` no input ou
  // vêm de `<Select>`. Sem elas, o dialog mostraria o texto padrão do zod, em
  // inglês, embaixo do campo.
  priority: z.coerce
    .number({ error: "Informe um número entre 1 e 99." })
    .int("A prioridade tem de ser um número inteiro.")
    .min(1, "A prioridade mínima é 1.")
    .max(99, "A prioridade máxima é 99.")
    .optional(),
  fit: z.string().max(60).optional().or(z.literal("")),
  targetSalary: z.string().max(200).optional().or(z.literal("")),
  followUp: z.string().max(200).optional().or(z.literal("")),
  appliedAt: z.string().max(40).optional().or(z.literal("")),
  outcomeReason: z.string().max(300).optional().or(z.literal("")),
  notesMd: z.string().max(20000).optional().or(z.literal("")),
});

/** `"2026-08-04"` → meia-noite **UTC**, inverso exato de `toDateInputValue`.
 *  Ler em outro fuso faria cada salvamento recuar a data em um dia (§A5). */
function toCalendarDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Escrita pontual dos campos de DECISÃO. Campo em branco vira `null` — este
 * dialog é a única superfície que edita esses campos, então "apagar" precisa
 * ser possível; o formulário completo continua sendo o dono das chaves.
 */
export async function updateApplicationKeyFields(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." };
  }

  const priority = trim(formData.get("priority"));
  const sponsorship = trim(formData.get("sponsorship"));
  const source = trim(formData.get("source"));
  const parsed = fieldsSchema.safeParse({
    roleTitle: trim(formData.get("roleTitle")),
    market: trim(formData.get("market")),
    source: source === NONE ? "" : source,
    // A sentinela significa "herdar de `job.sponsorship`", que no banco é NULL.
    sponsorship: sponsorship === INHERIT ? "" : sponsorship,
    priority: priority === "" ? undefined : priority,
    fit: trim(formData.get("fit")),
    targetSalary: trim(formData.get("targetSalary")),
    followUp: trim(formData.get("followUp")),
    appliedAt: trim(formData.get("appliedAt")),
    outcomeReason: trim(formData.get("outcomeReason")),
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

  if (data.appliedAt && toCalendarDate(data.appliedAt) === null) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: { appliedAt: "Data inválida." },
    };
  }

  try {
    await db.application.update({
      where: { id },
      data: {
        roleTitle: emptyToNull(data.roleTitle),
        market: emptyToNull(data.market),
        source: emptyToNull(data.source),
        sponsorship: data.sponsorship ? data.sponsorship : null,
        priority: data.priority ?? null,
        fit: emptyToNull(data.fit),
        targetSalary: emptyToNull(data.targetSalary),
        followUp: emptyToNull(data.followUp),
        appliedAt: toCalendarDate(data.appliedAt),
        outcomeReason: emptyToNull(data.outcomeReason),
        notesMd: emptyToNull(data.notesMd),
        lastMcpTool: TOOL.fields,
        lastSeenAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[admin] update application key fields failed", err);
    return { ok: false, message: "Não foi possível salvar as alterações." };
  }

  revalidateApplication(id);
  return { ok: true, message: "Candidatura atualizada." };
}

/* ── 4. checklist do pacote ───────────────────────────────────────────────── */

export async function setChecklistItemDone(
  itemId: string,
  done: boolean,
): Promise<ActionResult> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." };
  }

  let applicationId: string;
  try {
    const item = await db.checklistItem.update({
      where: { id: itemId },
      // `doneAt` acompanha `done`: desmarcar limpa a data, senão a checklist
      // guardaria "concluído em" de um item que voltou a estar pendente.
      data: { done, doneAt: done ? new Date() : null, lastMcpTool: TOOL.checklist },
      select: { applicationId: true },
    });
    applicationId = item.applicationId;
  } catch (err) {
    console.error("[admin] set checklist item failed", err);
    return { ok: false, message: "Não foi possível atualizar a checklist." };
  }

  revalidateApplication(applicationId);
  return {
    ok: true,
    message: done ? "Item concluído." : "Item reaberto.",
  };
}
