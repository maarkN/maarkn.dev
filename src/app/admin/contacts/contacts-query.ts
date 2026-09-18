import "server-only";
import type { Prisma } from "@prisma/client";
import { db, dbConfigured } from "@/lib/db";
import { isContactsTab, type ContactsTab } from "./vocabulary";

/**
 * Leitura de `/admin/contacts` — recrutadores (`Contact`) e referências
 * profissionais (`ProfessionalReference`).
 *
 * ── ESTA TELA É PII DE TERCEIROS ──────────────────────────────────────────
 * Nome, e-mail, telefone e LinkedIn de gente que não é o usuário. As duas
 * tabelas têm CHECK no banco forçando `visibility = 'private'`, e nada aqui
 * pode afrouxar isso. Três consequências concretas no código:
 *
 * 1. **Nenhuma rota pública lê daqui.** Este módulo é `server-only` e vive sob
 *    `src/app/admin/`, cuja página tem guard de sessão. Não exporte nada dele
 *    para `src/app/(site)` nem para o chat público.
 * 2. **Erro não é logado com o payload.** `console.error(err)` de um erro do
 *    Prisma pode carregar os argumentos da consulta — e o argumento aqui é
 *    literalmente o e-mail que alguém digitou na busca. Por isso todo catch usa
 *    `safeError`, que só deixa passar nome e código do erro. É de propósito que
 *    o log fique mais pobre: um log de PII é um vazamento permanente, e o dado
 *    para depurar continua acessível no banco.
 * 3. **Nenhuma consulta traz a tabela inteira.** Paginação server-side também
 *    aqui, mesmo com 27 linhas: a superfície de exposição de um `findMany` sem
 *    `take` cresce sozinha.
 */

export const CONTACTS_PAGE_SIZE = 20;

/** Só o nome e o código do erro. Ver o item 2 do cabeçalho. */
function safeError(err: unknown): string {
  if (err && typeof err === "object") {
    const name = err instanceof Error ? err.name : "Error";
    const code = (err as { code?: unknown }).code;
    return code === undefined ? name : `${name}(${String(code)})`;
  }
  return "erro desconhecido";
}

const CONTACT_SELECT = {
  id: true,
  name: true,
  roleTitle: true,
  email: true,
  phone: true,
  linkedinUrl: true,
  timezone: true,
  channel: true,
  notesMd: true,
  updatedAt: true,
  company: { select: { id: true, name: true, folderName: true } },
  application: { select: { id: true, folderName: true, stage: true } },
  _count: { select: { events: true, interviews: true } },
} satisfies Prisma.ContactSelect;

export type ContactListRow = Prisma.ContactGetPayload<{
  select: typeof CONTACT_SELECT;
}>;

const REFERENCE_SELECT = {
  id: true,
  slug: true,
  name: true,
  relationship: true,
  companyName: true,
  roleTitle: true,
  email: true,
  phone: true,
  linkedinUrl: true,
  language: true,
  canContact: true,
  noteMd: true,
  updatedAt: true,
} satisfies Prisma.ProfessionalReferenceSelect;

export type ReferenceListRow = Prisma.ProfessionalReferenceGetPayload<{
  select: typeof REFERENCE_SELECT;
}>;

export type ContactFilters = {
  tab: ContactsTab;
  q: string;
  /** Só na aba de contatos: `linkedin | email | vanhack | referral`… */
  channel: string;
  /** Só na aba de contatos: `Company.folderName` (chave natural, estável). */
  company: string;
};

export const EMPTY_CONTACT_FILTERS: ContactFilters = {
  tab: "contacts",
  q: "",
  channel: "",
  company: "",
};

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** `channel` e `folderName` são texto livre no schema; o que dá para exigir é
 * que sejam slugs curtos, e é o que impede um valor forjado de virar consulta. */
const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,79}$/i;

export function parseContactFilters(params: RawParams): ContactFilters {
  const tab = one(params.tab).trim();
  const channel = one(params.channel).trim();
  const company = one(params.company).trim();
  return {
    tab: isContactsTab(tab) ? tab : "contacts",
    q: one(params.q).trim().slice(0, 120),
    channel: SLUG_RE.test(channel) ? channel : "",
    company: SLUG_RE.test(company) ? company : "",
  };
}

export function parseContactsPage(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(one(value), 10);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}

/** A aba não conta como filtro: ela é a tela, não um recorte dela. */
export function hasAnyContactFilter(filters: ContactFilters): boolean {
  return Boolean(filters.q || filters.channel || filters.company);
}

export function contactsQueryKey(filters: ContactFilters, page: number): string {
  return [filters.tab, filters.q, filters.channel, filters.company, page].join("|");
}

export function buildContactWhere(
  filters: ContactFilters,
): Prisma.ContactWhereInput {
  const and: Prisma.ContactWhereInput[] = [];
  if (filters.channel) and.push({ channel: filters.channel });
  if (filters.company) and.push({ company: { folderName: filters.company } });
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    and.push({
      OR: [
        { name: contains },
        { roleTitle: contains },
        { email: contains },
        { company: { name: contains } },
        { application: { folderName: contains } },
      ],
    });
  }
  return and.length > 0 ? { AND: and } : {};
}

export function buildReferenceWhere(
  filters: ContactFilters,
): Prisma.ProfessionalReferenceWhereInput {
  if (!filters.q) return {};
  const contains = { contains: filters.q, mode: "insensitive" as const };
  return {
    OR: [
      { name: contains },
      { slug: contains },
      { companyName: contains },
      { roleTitle: contains },
      { relationship: contains },
      { email: contains },
    ],
  };
}

export type ListResult<T> = {
  rows: T[];
  total: number;
  page: number;
  totalPages: number;
  /** `true` quando a consulta falhou ou não há banco: a tabela mostra o estado
   * destrutivo em vez de mentir "nenhum registro". */
  failed: boolean;
};

function emptyResult<T>(): ListResult<T> {
  return { rows: [], total: 0, page: 1, totalPages: 1, failed: true };
}

export async function listContacts(args: {
  filters: ContactFilters;
  page: number;
  pageSize?: number;
}): Promise<ListResult<ContactListRow>> {
  const pageSize = args.pageSize ?? CONTACTS_PAGE_SIZE;
  if (!dbConfigured) return emptyResult<ContactListRow>(); // A3
  const where = buildContactWhere(args.filters);
  try {
    const total = await db.contact.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, args.page), totalPages);
    const rows = await db.contact.findMany({
      where,
      select: CONTACT_SELECT,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { rows, total, page, totalPages, failed: false };
  } catch (err) {
    console.error("[admin] list contacts failed", safeError(err));
    return emptyResult<ContactListRow>();
  }
}

export async function listReferences(args: {
  filters: ContactFilters;
  page: number;
  pageSize?: number;
}): Promise<ListResult<ReferenceListRow>> {
  const pageSize = args.pageSize ?? CONTACTS_PAGE_SIZE;
  if (!dbConfigured) return emptyResult<ReferenceListRow>(); // A3
  const where = buildReferenceWhere(args.filters);
  try {
    const total = await db.professionalReference.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, args.page), totalPages);
    const rows = await db.professionalReference.findMany({
      where,
      select: REFERENCE_SELECT,
      // Quem pode ser acionado primeiro: é a pergunta que se faz na tela.
      orderBy: [{ canContact: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { rows, total, page, totalPages, failed: false };
  } catch (err) {
    console.error("[admin] list professional references failed", safeError(err));
    return emptyResult<ReferenceListRow>();
  }
}

/** Contagem das duas abas, para o rótulo do seletor. */
export async function countContactTabs(): Promise<Record<ContactsTab, number>> {
  if (!dbConfigured) return { contacts: 0, references: 0 };
  try {
    const [contacts, references] = await Promise.all([
      db.contact.count(),
      db.professionalReference.count(),
    ]);
    return { contacts, references };
  } catch (err) {
    console.error("[admin] count contact tabs failed", safeError(err));
    return { contacts: 0, references: 0 };
  }
}

/** Canais distintos já gravados, para o `<Select>` de filtro. */
export async function listContactChannels(): Promise<string[]> {
  if (!dbConfigured) return [];
  try {
    const rows = await db.contact.findMany({
      where: { channel: { not: null } },
      distinct: ["channel"],
      select: { channel: true },
    });
    return rows
      .map((row) => row.channel)
      .filter((channel): channel is string => Boolean(channel))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  } catch (err) {
    console.error("[admin] list contact channels failed", safeError(err));
    return [];
  }
}

export type CompanyOption = { id: string; name: string; folderName: string };

/**
 * Empresas, para o filtro e para o `<Select>` do formulário.
 *
 * O formulário escolhe de uma LISTA em vez de aceitar texto livre de propósito:
 * digitar o nome criaria uma `Company` nova a cada erro de digitação, e empresa
 * é entidade compartilhada com vagas e candidaturas.
 */
export async function listCompanyOptions(): Promise<CompanyOption[]> {
  if (!dbConfigured) return [];
  try {
    return await db.company.findMany({
      select: { id: true, name: true, folderName: true },
      orderBy: [{ name: "asc" }],
      take: 500,
    });
  } catch (err) {
    console.error("[admin] list company options failed", safeError(err));
    return [];
  }
}
