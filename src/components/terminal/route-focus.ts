/*
 * Where focus goes after a client-side navigation. The pages of the site move
 * it to their `<h1>` — but only when the visitor arrived from another route of
 * this same document (the terminal's `open 1`, a listing link), never on a
 * fresh page load, where the first Tab must still reach the skip link. Both
 * the terminal and the site record the route they show; a page whose
 * pathname differs from the last recorded one was navigated to.
 */

let last: string | null = null;

/** Where the browser's back or forward is going to: its scroll is the browser's. */
let traversed: string | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    traversed = window.location.pathname;
  });
}

/** The document already showed a different route: this is a navigation. */
export function arrivedByNavigation(pathname: string): boolean {
  return last !== null && last !== pathname;
}

/** It was the browser's back or forward, not a link. */
export function arrivedThroughHistory(pathname: string): boolean {
  return traversed === pathname;
}

export function rememberRoute(pathname: string): void {
  last = pathname;
  traversed = null;
}
