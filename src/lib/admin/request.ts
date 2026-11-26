import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getAdminDictionary } from "@/i18n/config";
import { createFormat, type FormatSettings } from "@/lib/format";
import { ADMIN_LOCALE_COOKIE, resolveAdminLocale, SITE_LOCALE_COOKIE } from "./locale";
import { ADMIN_TIME_ZONE_COOKIE, resolveTimeZone } from "./time-zone";

/*
 * Language, time zone and texts of the backoffice for the request being answered.
 * Resolved once per request; the browser receives the same values as data
 * (src/components/admin/admin-locale.tsx) and resolves nothing.
 */

export const getAdminSettings = cache(async (): Promise<FormatSettings> => {
  const [jar, sent] = await Promise.all([cookies(), headers()]);
  return {
    locale: resolveAdminLocale({
      own: jar.get(ADMIN_LOCALE_COOKIE)?.value,
      site: jar.get(SITE_LOCALE_COOKIE)?.value,
      acceptLanguage: sent.get("accept-language"),
    }),
    timeZone: resolveTimeZone(jar.get(ADMIN_TIME_ZONE_COOKIE)?.value),
  };
});

/** The formatters of `@/lib/format`, for a Server Component. A client one uses `useAdminFormat`. */
export const getAdminFormat = async () => createFormat(await getAdminSettings());

export const getAdminLabels = async () => getAdminDictionary((await getAdminSettings()).locale);
