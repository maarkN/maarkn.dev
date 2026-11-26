/**
 * The order of a list, in the URL (`?sort=updated&dir=desc`), like its filters
 * and its page: reloading or sharing the address shows the same list. Pure; the
 * page reads it and the server applies it.
 */

export type SortDir = "asc" | "desc";
export type Sort<Key extends string> = { key: Key; dir: SortDir };

type RawParams = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** The order the URL asks for, among the allowed ones; anything else is the default. */
export function parseSort<Key extends string>(
  params: RawParams,
  keys: readonly Key[],
  fallback: Sort<Key>,
): Sort<Key> {
  const key = one(params.sort);
  if (!(keys as readonly string[]).includes(key)) return fallback;
  const dir = one(params.dir);
  return { key: key as Key, dir: dir === "asc" || dir === "desc" ? dir : "asc" };
}

/**
 * The address of the same list ordered by `key`: the other way round when it is
 * already ordered by it, back to the first page, every filter kept.
 */
export function sortHref<Key extends string>(
  pathname: string,
  params: RawParams,
  current: Sort<Key>,
  key: Key,
  first: SortDir = "asc",
): string {
  const next = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (name === "sort" || name === "dir" || name === "page") continue;
    const written = one(value);
    if (written) next.set(name, written);
  }
  next.set("sort", key);
  next.set("dir", current.key === key ? (current.dir === "asc" ? "desc" : "asc") : first);
  return `${pathname}?${next.toString()}`;
}

/** The address of the same list without filters, order or page. */
export function clearedHref(pathname: string, keep: RawParams = {}): string {
  const next = new URLSearchParams();
  for (const [name, value] of Object.entries(keep)) {
    const written = one(value);
    if (written) next.set(name, written);
  }
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** The address of exactly what is on screen: "try again" reloads it. */
export function currentHref(pathname: string, params: RawParams): string {
  return clearedHref(pathname, params);
}
