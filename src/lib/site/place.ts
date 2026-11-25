/**
 * Where the visitor was on the site, so the CLI version can take them back
 * there. Kept for the tab; without storage, the way back is the home.
 */
import { localizedHref, isTerminalLocale, type TerminalLocale } from "@/lib/terminal/locale";
import { terminalHref } from "@/lib/terminal/address";

const PLACE_KEY = "maarkn-place";

/** `path` is what the browser shows: pathname and query string. */
export function rememberPlace(path: string): void {
  try {
    sessionStorage.setItem(PLACE_KEY, path);
  } catch {
    /* blocked storage: the way back is the home */
  }
}

/** The saved page in `locale`; the home when there is none, or when it is not one of ours. */
export function placeToReturn(locale: TerminalLocale): string {
  const home = `/${locale}`;
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(PLACE_KEY);
  } catch {
    return home;
  }
  if (!saved?.startsWith("/") || saved.startsWith("//")) return home;
  const { pathname, search, origin } = new URL(saved, window.location.origin);
  const [prefix = ""] = pathname.split("/").filter(Boolean);
  if (origin !== window.location.origin || !isTerminalLocale(prefix)) return home;
  if (pathname === terminalHref(prefix)) return home;
  return localizedHref(pathname, search, locale);
}
