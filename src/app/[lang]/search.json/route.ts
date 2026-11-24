import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { buildSearchIndex } from "@/lib/site/search-index";

// As fresh as the listing it indexes (`/projects` is dynamic too): built per
// request, and only requested by whoever opens the search.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/[lang]/search.json">) {
  const { lang } = await ctx.params;
  if (!hasLocale(lang)) notFound();
  return Response.json(await buildSearchIndex(await getDictionary(lang), lang));
}
