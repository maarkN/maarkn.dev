/**
 * Vocabulário de `/admin/contacts`. Importável pelo cliente (toolbar e
 * formulários) e pelo servidor (validação das actions) — por isso não toca no
 * Prisma nem em `@/lib/db`.
 *
 * `Contact.channel` e `ProfessionalReference.language` são `String` no schema:
 * o MCP grava o que o vault escreveu. As listas abaixo são a lista CURADA que a
 * UI oferece, não uma restrição — `channelLabel` devolve a chave crua quando o
 * valor não está no mapa, e o `<Select>` de filtro é alimentado pelos valores
 * distintos do banco.
 */

/* ── abas ─────────────────────────────────────────────────────────────────
 *
 * Moram AQUI, e não em `contacts-query.ts`, porque a toolbar é um Client
 * Component: importar um valor de um módulo `server-only` arrastaria o Prisma
 * para o bundle do navegador e quebraria o build. Tipo pode cruzar a fronteira
 * (é apagado na compilação); valor não.
 */

export const CONTACT_TABS = ["contacts", "references"] as const;
export type ContactsTab = (typeof CONTACT_TABS)[number];

export const CONTACT_TAB_LABELS: Record<ContactsTab, string> = {
  contacts: "Recrutadores e contatos",
  references: "Referências profissionais",
};

export function isContactsTab(value: string): value is ContactsTab {
  return (CONTACT_TABS as readonly string[]).includes(value);
}

/* ── canal do contato ─────────────────────────────────────────────────────── */

export const CONTACT_CHANNELS = [
  "linkedin",
  "email",
  "vanhack",
  "referral",
  "portal",
  "phone",
  "event",
  "other",
] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  linkedin: "LinkedIn",
  email: "E-mail",
  vanhack: "VanHack",
  referral: "Indicação",
  portal: "Portal da vaga",
  phone: "Telefone",
  event: "Evento",
  other: "Outro",
};

export function channelLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (CONTACT_CHANNEL_LABELS as Record<string, string>)[value] ?? value;
}

/** Idioma em que a referência consegue falar/escrever sobre o trabalho. */
export const REFERENCE_LANGUAGES = ["pt-BR", "en-US", "es-ES", "de-DE"] as const;

export const REFERENCE_LANGUAGE_LABELS: Record<string, string> = {
  "pt-BR": "Português",
  "en-US": "Inglês",
  "es-ES": "Espanhol",
  "de-DE": "Alemão",
};

export function referenceLanguageLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return REFERENCE_LANGUAGE_LABELS[value] ?? value;
}
