import type { Dictionary } from "@/i18n/config";

type Site = Dictionary["site"];

/**
 * The part of the `site` dictionary the chrome shows. The rest stays on the
 * server: the words of the search index and the text of the screens.
 */
export type SiteLabels = Omit<Site, "search" | "opening"> & { search: Omit<Site["search"], "terms"> };

export function chromeLabels({ search: { terms, ...search }, opening, ...site }: Site): SiteLabels {
  void terms;
  void opening;
  return { ...site, search };
}
