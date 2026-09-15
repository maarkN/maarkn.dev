/*
 * Where focus goes after a client-side navigation. The inner pages move it
 * to their `<h1>` — but only when the visitor arrived from another route of
 * this same document (the terminal's `open 1`, a listing link), never on a
 * fresh page load, where the first Tab must still reach the skip link. Both
 * the terminal and the page chrome record the route they show; a page whose
 * pathname differs from the last recorded one was navigated to.
 */

let last: string | null = null;

/** The document already showed a different route: this is a navigation. */
export function arrivedByNavigation(pathname: string): boolean {
  return last !== null && last !== pathname;
}

export function rememberRoute(pathname: string): void {
  last = pathname;
}

/** Tests only. */
export function resetRouteMemory(): void {
  last = null;
}
