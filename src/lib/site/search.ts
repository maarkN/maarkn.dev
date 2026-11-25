/**
 * Matching of the site's search. Pure: the index is built on the server
 * (search-index.ts) and the window only filters it.
 */
import type { SiteTheme } from "@/lib/site-theme";

/** In the order the results of equal weight are listed. */
export const SEARCH_KINDS = [
  "section",
  "page",
  "cli",
  "project",
  "experience",
  "theme",
  "language",
  "cv",
] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export type SearchTarget =
  | { type: "page"; href: string }
  | { type: "file"; href: string }
  | { type: "theme"; theme: SiteTheme }
  | { type: "language" };

export type SearchItem = {
  id: string;
  kind: SearchKind;
  title: string;
  /** One line under the title. */
  detail?: string;
  /** What else finds it: technologies, other names. */
  terms: string[];
  /** `lang` of the title, when it is not the page's. */
  lang?: string;
  target: SearchTarget;
};

/** Lower case, without accents. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** `Node.js` is found as `node.js`, `nodejs` and `node`. */
const words = (text: string) =>
  fold(text)
    .split(/[^\p{L}\p{N}+#.]+/u)
    .map((word) => word.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);

const spellings = (text: string) =>
  words(text).flatMap((word) => (word.includes(".") ? [word, word.replaceAll(".", "")] : [word]));

/** A short token is a name being typed (`go`, `ci`): anywhere inside a word it would be noise. */
const SHORT = 3;

function weigh(token: string, item: SearchItem): number {
  const title = spellings(item.title);
  if (title.includes(token)) return 8;
  if (title.some((word) => word.startsWith(token))) return 6;
  const terms = item.terms.flatMap((term) => [fold(term), ...spellings(term)]);
  if (terms.includes(token)) return 5;
  if (token.length < SHORT) return 0;
  if (terms.some((term) => term.startsWith(token))) return 4;
  if (fold(item.title).includes(token)) return 3;
  if (terms.some((term) => term.includes(token))) return 2;
  return words(item.detail ?? "").some((word) => word.startsWith(token)) ? 1 : 0;
}

/** Every word of the query has to be somewhere in the item. */
function score(tokens: string[], item: SearchItem): number {
  let total = 0;
  for (const token of tokens) {
    const weight = weigh(token, item);
    if (weight === 0) return 0;
    total += weight;
  }
  return total;
}

/** With nothing typed: where one can go and what one can change, not the whole catalogue. */
const SUGGESTED = new Set<SearchKind>(["section", "page", "cli", "theme", "language", "cv"]);

export function search(items: readonly SearchItem[], query: string): SearchItem[] {
  const tokens = words(query);
  if (tokens.length === 0) {
    return query.trim() === "" ? items.filter((item) => SUGGESTED.has(item.kind)) : [];
  }
  return items
    .map((item, index) => ({ item, index, score: score(tokens, item) }))
    .filter((found) => found.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}
