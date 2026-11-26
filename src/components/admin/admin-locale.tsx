"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AdminDictionary } from "@/i18n/config";
import { UNTRANSLATED, type AdminLocale } from "@/lib/admin/locale";
import { DEFAULT_TIME_ZONE } from "@/lib/admin/time-zone";
import { createFormat, type Format, type FormatSettings } from "@/lib/format";

/** The words every screen shares: closing, cancelling, the pager, the states of a list. */
export type CommonLabels = AdminDictionary["common"];

const Settings = createContext<FormatSettings>({ locale: UNTRANSLATED, timeZone: DEFAULT_TIME_ZONE });
const ScreenLanguage = createContext<AdminLocale | undefined>(undefined);
const Common = createContext<Partial<Record<AdminLocale, CommonLabels>>>({});

/**
 * Language and time zone of the backoffice, as the server resolved them, and the
 * shared words in that language and in the one of the screens that were not
 * translated yet. One, in the layout.
 */
export function AdminLocaleProvider({
  locale,
  timeZone,
  common = {},
  children,
}: FormatSettings & { common?: Partial<Record<AdminLocale, CommonLabels>>; children: ReactNode }) {
  return (
    <Settings value={{ locale, timeZone }}>
      <Common value={common}>{children}</Common>
    </Settings>
  );
}

/** The formatters of `@/lib/format`, for a Client Component. A server one uses `getAdminFormat`. */
export function useAdminFormat(): Format {
  return createFormat(useContext(Settings));
}

/** The language of the interface, as the server resolved it. */
export function useAdminLocale(): AdminLocale {
  return useContext(Settings).locale;
}

/**
 * The shared words, in the language of the screen they are written on: a
 * primitive inside a screen that was not translated yet speaks Portuguese with
 * it. Empty strings where the layout gave none (a test without the provider).
 */
export function useCommonLabels(): CommonLabels {
  const screen = useContext(ScreenLanguage);
  const { locale } = useContext(Settings);
  const all = useContext(Common);
  return all[screen ?? locale] ?? all[locale] ?? MISSING;
}

/**
 * A screen that was not translated yet, or a part of one: it says so, for
 * whoever reads it aloud. A context too, because what the screen opens over
 * itself is portalled out of this element (`useScreenLanguage`).
 */
export function Untranslated({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ScreenLanguage value={UNTRANSLATED}>
      <div lang={UNTRANSLATED} className={className}>
        {children}
      </div>
    </ScreenLanguage>
  );
}

/** The part of an untranslated screen that is in the language of the interface. */
export function Translated({ className, children }: { className?: string; children: ReactNode }) {
  const { locale } = useContext(Settings);
  return (
    <ScreenLanguage value={undefined}>
      <div lang={locale} className={className}>
        {children}
      </div>
    </ScreenLanguage>
  );
}

/** `lang` of what a screen portals; `undefined` where the language is the document's. */
export function useScreenLanguage(): AdminLocale | undefined {
  return useContext(ScreenLanguage);
}

/** The language a portalled piece is written in: the screen's, or the interface's. */
export function useWrittenLanguage(): AdminLocale {
  const screen = useContext(ScreenLanguage);
  const { locale } = useContext(Settings);
  return screen ?? locale;
}

const NESTED = new Set(["pager", "total", "states", "sort", "confirm", "filters", "applied"]);
const MISSING: CommonLabels = new Proxy({} as CommonLabels, {
  get: (_, key) => (typeof key === "string" && NESTED.has(key) ? MISSING : ""),
});
