/**
 * Where the CLI version lives: `/{lang}/terminal`. Everything that points at
 * it, from inside (`cd ~`, `cd ..`) and from the site, asks here.
 */
export const TERMINAL_SEGMENT = "terminal";

export function terminalHref(locale: string, search = ""): string {
  return `/${locale}/${TERMINAL_SEGMENT}${search}`;
}
