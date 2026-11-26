"use client";

import { createContext, useContext, type ReactNode } from "react";
import { UNTRANSLATED, type AdminLocale } from "@/lib/admin/locale";
import { DEFAULT_TIME_ZONE } from "@/lib/admin/time-zone";
import { createFormat, type Format, type FormatSettings } from "@/lib/format";

const Settings = createContext<FormatSettings>({ locale: UNTRANSLATED, timeZone: DEFAULT_TIME_ZONE });
const ScreenLanguage = createContext<AdminLocale | undefined>(undefined);

/** Language and time zone of the backoffice, as the server resolved them. One, in the layout. */
export function AdminLocaleProvider({ locale, timeZone, children }: FormatSettings & { children: ReactNode }) {
  return <Settings value={{ locale, timeZone }}>{children}</Settings>;
}

/** The formatters of `@/lib/format`, for a Client Component. A server one uses `getAdminFormat`. */
export function useAdminFormat(): Format {
  return createFormat(useContext(Settings));
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
