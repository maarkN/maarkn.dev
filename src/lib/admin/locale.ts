/**
 * The language of the backoffice: which ones there are, where the choice is kept
 * and how it is resolved. No prefix in the address (design of rebrand-08): its
 * own cookie, then the site's, then the browser.
 *
 * Plain module: the server resolves it (request.ts) and the browser is told.
 */

export const ADMIN_LOCALES = ["pt-BR", "en"] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];

/** The choice made in the account menu; only the backoffice receives it. */
export const ADMIN_LOCALE_COOKIE = "admin-locale";
/** The choice made on the site (src/lib/terminal/locale.ts). */
export const SITE_LOCALE_COOKIE = "locale";

/** The language of the screens that were not translated yet. */
export const UNTRANSLATED: AdminLocale = "pt-BR";

const DEFAULT: AdminLocale = "en";

export function isAdminLocale(value: unknown): value is AdminLocale {
  return (ADMIN_LOCALES as readonly unknown[]).includes(value);
}

/** Keeps the choice for a year, for the backoffice alone: the site has its own. In the browser. */
export function rememberAdminLocale(next: AdminLocale): void {
  document.cookie = `${ADMIN_LOCALE_COOKIE}=${next}; path=/admin; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** The first language of the browser's list that the backoffice speaks. */
function fromBrowser(acceptLanguage: string | null | undefined): AdminLocale | null {
  const accepted = (acceptLanguage ?? "")
    .split(",")
    .map((entry) => {
      const [tag, ...params] = entry.trim().toLowerCase().split(";");
      const q = params.map((param) => /^\s*q=([\d.]+)\s*$/.exec(param)?.[1]).find(Boolean);
      return { tag: tag.trim(), q: q === undefined ? 1 : Number(q) };
    })
    .filter(({ tag, q }) => tag !== "" && q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of accepted) {
    if (tag === "pt" || tag.startsWith("pt-")) return "pt-BR";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return null;
}

export function resolveAdminLocale({
  own,
  site,
  acceptLanguage,
}: {
  own?: string;
  site?: string;
  acceptLanguage?: string | null;
}): AdminLocale {
  if (isAdminLocale(own)) return own;
  if (isAdminLocale(site)) return site;
  return fromBrowser(acceptLanguage) ?? DEFAULT;
}
