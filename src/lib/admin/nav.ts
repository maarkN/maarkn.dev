/**
 * Where things are in the backoffice (docs/design/backoffice.md): the menu, what
 * can be created, and the way back from a screen inside another. Pure; the words
 * are in the dictionary (`admin`), by the same keys.
 */

/** `href: null`: not built yet. Shown as "em breve", neither a link nor a tab stop. */
export type Destination<Key extends string> = { key: Key; href: string | null };

export type NavKey =
  | "overview" | "agenda"
  | "applications" | "jobs" | "contacts" | "generator"
  | "projects" | "experiences" | "notes" | "assistant"
  | "apiKeys" | "audit" | "settings";
export type NavGroupKey = "panel" | "career" | "site" | "system";
export type NavItem = Destination<NavKey>;

export const NAV: readonly { key: NavGroupKey; items: readonly NavItem[] }[] = [
  {
    key: "panel",
    items: [
      { key: "overview", href: "/admin" },
      { key: "agenda", href: null },
    ],
  },
  {
    key: "career",
    items: [
      { key: "applications", href: "/admin/applications" },
      { key: "jobs", href: "/admin/jobs" },
      { key: "contacts", href: "/admin/contacts" },
      { key: "generator", href: "/admin/generator" },
    ],
  },
  {
    key: "site",
    items: [
      { key: "projects", href: "/admin/projects" },
      { key: "experiences", href: null },
      { key: "notes", href: null },
      { key: "assistant", href: "/admin/chat" },
    ],
  },
  {
    key: "system",
    items: [
      { key: "apiKeys", href: "/admin/api-keys" },
      { key: "audit", href: "/admin/audit" },
      { key: "settings", href: "/admin/settings" },
    ],
  },
];

export const NAV_ITEMS: readonly NavItem[] = NAV.flatMap(({ items }) => items);

/** The four of the bar at the foot of a phone; the rest is under "Mais". */
export const SHORTCUTS: readonly NavKey[] = ["overview", "applications", "jobs", "contacts"];

export type CreateKey = "application" | "appointment" | "project" | "resume";

export const CREATE: readonly Destination<CreateKey>[] = [
  { key: "application", href: "/admin/applications/new" },
  { key: "appointment", href: null },
  { key: "project", href: "/admin/projects/new" },
  { key: "resume", href: "/admin/generator" },
];

/** `/admin` matches exactly; every other entry, its subtree too. */
function isAt(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

/**
 * The entry of the menu the screen belongs to, and only one: two current items
 * would leave a screen reader without an answer to where one is.
 */
export function currentItem(pathname: string): NavItem | null {
  return NAV_ITEMS.find(({ href }) => href !== null && isAt(pathname, href)) ?? null;
}

/** The screens inside another one, and what they are called. */
export type ScreenKey = "board" | "newApplication" | "application" | "newProject" | "project" | "generation" | "edit";

/** A step on the way to the screen. `text` is data (the name of a record); `key` is a word of the interface. */
export type Step = { href?: string } & ({ nav: NavKey } | { screen: ScreenKey } | { text: string });

const SECTIONS: Partial<Record<NavKey, { views?: Record<string, ScreenKey>; record: ScreenKey; detail: boolean }>> = {
  applications: { views: { board: "board", new: "newApplication" }, record: "application", detail: true },
  // Projects have a form and no screen of their own.
  projects: { views: { new: "newProject" }, record: "project", detail: false },
  generator: { record: "generation", detail: true },
};

/**
 * From the entry of the menu to the screen, the last step being the screen
 * itself. Empty where the entry of the menu is the screen: there is nowhere to
 * go back to.
 *
 * @param name the name of the record on screen, from the page that loaded it.
 */
export function trail(pathname: string, name?: string | null): Step[] {
  const item = currentItem(pathname);
  const section = item && SECTIONS[item.key];
  if (!item?.href || !section || pathname === item.href) return [];
  const [id, action] = pathname.slice(item.href.length + 1).split("/");

  const start: Step = { nav: item.key, href: item.href };
  const view = section.views?.[id];
  if (view) return [start, { screen: view }];

  const label: Step = name?.trim() ? { text: name.trim() } : { screen: section.record };
  if (action !== "edit") return [start, label];
  return [start, section.detail ? { ...label, href: `${item.href}/${id}` } : label, { screen: "edit" }];
}
