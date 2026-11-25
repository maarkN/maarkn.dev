/**
 * What the search of the backoffice finds: screens, actions and candidaturas.
 * Screens and actions are the interface, so they are in the page; candidaturas
 * are data, and only arrive when the window opens (src/app/_actions/search.ts).
 */
import type { AdminDictionary } from "@/i18n/config";
import { rank, type Searchable } from "@/lib/site/search";
import { SITE_THEMES, type SiteTheme } from "@/lib/site-theme";
import { ADMIN_LOCALES, type AdminLocale } from "./locale";
import { CREATE, NAV_ITEMS } from "./nav";

export type ResultKind = "screen" | "application" | "action";

export type ResultTarget =
  | { type: "page"; href: string }
  | { type: "theme"; theme: SiteTheme }
  | { type: "language"; locale: AdminLocale }
  | { type: "site" }
  | { type: "signOut" };

export type Result = Searchable & {
  id: string;
  kind: ResultKind;
  /** `lang` of the title, when it is not the interface's. */
  lang?: string;
  target: ResultTarget;
};

/** What the server sends about a candidatura: enough to recognise it, and no more. */
export type FoundApplication = { id: string; company: string; role: string | null };

type Labels = Pick<AdminDictionary, "nav" | "create" | "account" | "search">;

/** Screens and actions, in the language of the interface. */
export function interfaceResults({ nav, create, account, search }: Labels, locale: AdminLocale): Result[] {
  const words = search.terms as Record<string, string[]>;
  const screens = NAV_ITEMS.flatMap(({ key, href }): Result[] =>
    href ? [{ id: key, kind: "screen", title: nav.items[key], terms: words[key] ?? [], target: { type: "page", href } }] : [],
  );
  screens.splice(screens.findIndex(({ id }) => id === "applications") + 1, 0, {
    id: "board",
    kind: "screen",
    title: nav.screens.board,
    detail: nav.items.applications,
    terms: words.board,
    target: { type: "page", href: "/admin/applications/board" },
  });

  const action = (id: string, title: string, terms: string[], target: ResultTarget): Result => ({
    id,
    kind: "action",
    title,
    terms,
    target,
  });
  const { actions } = search;
  return [
    ...screens,
    ...CREATE.flatMap(({ key, href }) =>
      href
        ? [action(`create-${key}`, actions.create.replace("{what}", create.items[key]), words.create, { type: "page", href })]
        : [],
    ),
    ...SITE_THEMES.map((theme) =>
      action(`theme-${theme}`, actions.theme.replace("{what}", account.themes[theme]), words.theme, { type: "theme", theme }),
    ),
    ...ADMIN_LOCALES.filter((other) => other !== locale).map((other) =>
      action(`language-${other}`, actions.language.replace("{what}", account.languages[other]), words.language, {
        type: "language",
        locale: other,
      }),
    ),
    action("site", actions.site, words.site, { type: "site" }),
    action("sign-out", actions.signOut, words.signOut, { type: "signOut" }),
  ];
}

export const applicationResult = ({ id, company, role }: FoundApplication): Result => ({
  id: `application-${id}`,
  kind: "application",
  title: company,
  detail: role ?? undefined,
  // The role finds it too, below the name of the company.
  terms: role ? [role] : [],
  target: { type: "page", href: `/admin/applications/${id}` },
});

/** With nothing typed: where one can go and what one can do, not every candidatura. */
export const findResults = (results: readonly Result[], query: string): Result[] =>
  rank(results, query, ({ kind }) => kind !== "application");
