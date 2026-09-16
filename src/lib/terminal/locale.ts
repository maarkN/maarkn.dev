/**
 * Language switching, shared by the `lang` command and the status bar. The
 * preference lives in the `locale` cookie that `src/proxy.ts` reads for
 * prefix-less URLs, so `lang pt` today means `/` lands on `/pt-BR` tomorrow.
 * Client-only helpers (cookie, `location`); nothing here imports the
 * server-only i18n config.
 */

const LOCALES = ["en", "pt-BR"] as const;
export type TerminalLocale = (typeof LOCALES)[number];

/** Cookie name the proxy honours; one year, whole site. */
const LOCALE_COOKIE = "locale";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const SHORT: Record<TerminalLocale, string> = { en: "en", "pt-BR": "pt" };

export const isTerminalLocale = (value: string): value is TerminalLocale =>
  (LOCALES as readonly string[]).includes(value);

/** `en` / `pt` — what the bar button and `lang` print. */
export const shortLocale = (locale: string): string =>
  isTerminalLocale(locale) ? SHORT[locale] : locale;

/** `pt`, `pt-br`, `br`, `en`, `en-us`… → a supported locale, or `null`. */
export function parseLocaleArg(arg: string | undefined): TerminalLocale | null {
  const value = arg?.trim().toLowerCase();
  if (!value) return null;
  if (value === "pt" || value === "br" || value.startsWith("pt-")) return "pt-BR";
  if (value === "en" || value.startsWith("en-")) return "en";
  return null;
}

export const otherLocale = (locale: string): TerminalLocale => (locale === "en" ? "pt-BR" : "en");

/** The same page under another locale prefix, query string kept. */
export function localizedHref(pathname: string, search: string, next: TerminalLocale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isTerminalLocale(segments[0])) segments[0] = next;
  else segments.unshift(next);
  const query = search && !search.startsWith("?") ? `?${search}` : search;
  return `/${segments.join("/")}${query}`;
}

export function rememberLocale(next: TerminalLocale): void {
  try {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    /* cookies disabled: the URL prefix still selects the language */
  }
}

/**
 * The whole switch: remember `next`, then take the visitor to the page they
 * are on under the other prefix (query string kept, so `?cmd=` survives).
 * `navigate` is whatever the caller uses to move (`router.push`, `ctx.navigate`).
 */
export function switchLocale(next: TerminalLocale, navigate: (href: string) => void): void {
  rememberLocale(next);
  navigate(localizedHref(window.location.pathname, window.location.search, next));
}
