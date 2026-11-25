import { NextRequest, NextResponse } from "next/server";
import { terminalHref } from "@/lib/terminal/address";

const SUPPORTED = ["en", "pt-BR"] as const;
const DEFAULT = "en";

function pickLocale(request: NextRequest): string {
  const cookie = request.cookies.get("locale")?.value;
  if (cookie && (SUPPORTED as readonly string[]).includes(cookie)) return cookie;

  const accept = request.headers.get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("pt")) return "pt-BR";
  return DEFAULT;
}

/**
 * Two redirects, both temporary and both with the same query string:
 * a path without a locale gets one, and a home that carries `?cmd=` (the
 * CLI version used to live there) goes to the CLI version, whatever the
 * value is: the terminal is the one that decides what may run.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const prefixed = SUPPORTED.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  const home = prefixed ? pathname === `/${prefixed}` : pathname === "/";
  const command = home && searchParams.has("cmd");
  if (prefixed && !command) return;

  const locale = prefixed ?? pickLocale(request);
  if (command) request.nextUrl.pathname = terminalHref(locale);
  else request.nextUrl.pathname = `/${locale}${home ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|admin|favicon.ico|.*\\..*).*)"],
};
