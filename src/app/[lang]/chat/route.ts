import { notFound, permanentRedirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";

/** The chat page is gone: old links land on the terminal with `ask` typed in. */
export async function GET(_req: Request, ctx: RouteContext<"/[lang]/chat">) {
  const { lang } = await ctx.params;
  if (!hasLocale(lang)) notFound();
  permanentRedirect(`/${lang}?cmd=ask`);
}
