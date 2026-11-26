"use client";

/**
 * What every dialog of the screen needs, delivered ONCE: the companies of the
 * `<Select>` and the words of the two forms.
 *
 * A context and not a prop: the edit dialog is rendered inside the `rows.map()`,
 * and the database has ~108 companies. Passing them by prop on each row would
 * copy the same options 20 times into the RSC payload of each page. The
 * provider wraps the whole screen, the data travels once, each dialog reads it.
 * Children from Server Components arrive already rendered, and the context
 * crosses them as usual.
 */

import { createContext, useContext } from "react";
import type { AdminDictionary } from "@/i18n/config";
import type { CompanyOption } from "./contacts-query";

export type ContactsWords = Pick<AdminDictionary["contacts"], "contact" | "reference"> & {
  vocab: Pick<AdminDictionary["vocab"], "channel" | "referenceLanguage">;
};

const ContactsContext = createContext<{ companies: CompanyOption[]; words: ContactsWords | null }>({
  companies: [],
  words: null,
});

export function CompanyOptionsProvider({
  companies,
  words,
  children,
}: {
  companies: CompanyOption[];
  words: ContactsWords;
  children: React.ReactNode;
}) {
  return <ContactsContext value={{ companies, words }}>{children}</ContactsContext>;
}

export function useCompanyOptions(): CompanyOption[] {
  return useContext(ContactsContext).companies;
}

export function useContactsWords(): ContactsWords {
  const { words } = useContext(ContactsContext);
  if (!words) throw new Error("useContactsWords outside CompanyOptionsProvider");
  return words;
}
