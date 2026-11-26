/**
 * The values of the contacts' screen, curated here: `channel` and `language`
 * are free text in the database. The words for them are in the dictionary
 * (`admin.vocab.channel`, `admin.vocab.referenceLanguage`).
 */

/* ── tabs ─────────────────────────────────────────────────────────────────── */

export const CONTACT_TABS = ["contacts", "references"] as const;
export type ContactsTab = (typeof CONTACT_TABS)[number];

export function isContactsTab(value: string): value is ContactsTab {
  return (CONTACT_TABS as readonly string[]).includes(value);
}

/* ── the channel of a contact ─────────────────────────────────────────────── */

export const CONTACT_CHANNELS = ["linkedin", "email", "vanhack", "referral", "portal", "phone", "event", "other"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const REFERENCE_LANGUAGES = ["pt-BR", "en-US", "es-ES", "de-DE"] as const;
export type ReferenceLanguage = (typeof REFERENCE_LANGUAGES)[number];

/** The word of a known value, or the value itself: an unknown one still shows. */
export function wordFor<Key extends string>(words: Record<Key, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return (words as Record<string, string>)[value] ?? value;
}
