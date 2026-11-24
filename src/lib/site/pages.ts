/**
 * The site's map, for whatever lists it: top, menu, footer and search. A page
 * or a section enters here with the screen that makes it exist, never before:
 * a link from here always has somewhere to land.
 */

const PATHS = {
  home: "",
  career: "/career",
  projects: "/projects",
  blog: "/blog",
  links: "/links",
} as const;

export type PageKey = keyof typeof PATHS;

export const PAGES = Object.keys(PATHS) as PageKey[];

/** The ones in the top, in this order (docs/design/site.md). The brand is the home. */
export const TOP_PAGES: readonly PageKey[] = ["career", "projects", "blog"];

export const pageHref = (locale: string, page: PageKey) => `/${locale}${PATHS[page]}`;

/** The sections of the home, by their anchor. */
export const SECTIONS = ["contact"] as const;
export type SectionKey = (typeof SECTIONS)[number];

export const sectionHref = (locale: string, section: SectionKey) => `/${locale}#${section}`;

/** The page the visitor is on; `exact` is false inside it (a project, a post). */
export function currentPage(pathname: string): { page: PageKey; exact: boolean } | null {
  const path = pathname.replace(/^\/[^/]+/, "").replace(/\/+$/, "");
  const page = PAGES.find((key) => PATHS[key] === path);
  if (page) return { page, exact: true };
  const parent = PAGES.find((key) => key !== "home" && path.startsWith(`${PATHS[key]}/`));
  return parent ? { page: parent, exact: false } : null;
}

/** `aria-current` of a link to `page`, seen from `pathname`. */
export function ariaCurrent(pathname: string, page: PageKey): "page" | "true" | undefined {
  const current = currentPage(pathname);
  if (current?.page !== page) return undefined;
  return current.exact ? "page" : "true";
}
