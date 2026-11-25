/** The element the address points at; an anchor nobody can read points at nothing. */
export function anchored(): HTMLElement | null {
  try {
    return document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  } catch {
    return null;
  }
}

/** Where a page is read from: the section in the address, or its title. The scroll is its caller's. */
export function focusArrival(): void {
  const target = anchored() ?? document.querySelector<HTMLElement>("#content h1");
  target?.focus({ preventScroll: true });
}

/**
 * Goes again to where the visitor already is: the top of the page, or its
 * section. The router does nothing with such an address. False when there is
 * still something for it to do: another page, another section, or a filter to
 * take out.
 */
export function arriveAgain(href: string): boolean {
  const to = new URL(href, window.location.href);
  const { pathname, search, hash } = window.location;
  if (to.pathname !== pathname || (to.hash && to.hash !== hash)) return false;
  const there = to.search === search;
  if (there && to.hash !== hash) window.history.replaceState(null, "", href);

  const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const behavior = there && !still ? "smooth" : "instant";
  const section = to.hash && anchored();
  if (section) section.scrollIntoView({ behavior });
  else window.scrollTo({ top: 0, behavior });
  focusArrival();
  return there;
}
