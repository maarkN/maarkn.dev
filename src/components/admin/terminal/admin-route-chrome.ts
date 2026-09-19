/**
 * Maps a backoffice pathname to the terminal chrome it wears: the location
 * shown in the status bar, the fake command in the breadcrumb and where
 * `cd ..` goes. The admin twin of `@/components/terminal/route-chrome`, and
 * pure for the same reason: the chrome is client-side and derives everything
 * from the URL, so one table answers all 18 routes.
 *
 * The table is normative — it is the one in
 * `openspec/changes/bko-02-chrome-navegacao/design.md`.
 */

export type AdminRouteChrome = {
  /** `~/admin/applications/<folder>` */
  path: string;
  /** `cat applications/<folder>.md` */
  command: string;
  /** Target of the `cd ..` link. */
  back: string;
};

/** The prompt's working directory: every command below is written from here. */
export const ADMIN_CWD = "~/admin";

const ADMIN_HOME = "/admin";

type Section = {
  /** Command of the section's listing, e.g. `ls applications/`. */
  list: string;
  /** Alternative listings living under the section root, e.g. `board`. */
  views?: Record<string, string>;
  /** Command of the `new` screen; absent → the section has no creation route. */
  create?: string;
  /** Command of a record's detail screen; absent → no detail route. */
  detail?: (name: string) => string;
  /** Command of a record's edit form; absent → no edit route. */
  edit?: (name: string) => string;
};

const SECTIONS: Record<string, Section> = {
  applications: {
    list: "ls applications/",
    views: { board: "ls applications/ --group-by=stage" },
    create: "touch applications/new.md",
    detail: (name) => `cat applications/${name}.md`,
    edit: (name) => `vim applications/${name}.md`,
  },
  // `/admin/projects` has `new` and `[id]/edit`, but no detail screen: `cd ..`
  // from the form goes back to the listing.
  projects: {
    list: "ls projects/",
    create: "touch projects/new.md",
    edit: (name) => `vim projects/${name}.md`,
  },
  jobs: { list: "ls jobs/" },
  contacts: { list: "ls contacts/" },
  generator: {
    list: "ls generations/",
    detail: (id) => `less generations/${id}.md`,
  },
  "api-keys": { list: "cat authorized_keys" },
  audit: { list: "tail -f audit.log" },
  chat: { list: "tail chat.log" },
  settings: { list: "vim ~/.config/admin.conf" },
};

/**
 * @param pathname the current `/admin/**` route.
 * @param name the record's natural key (an application's `folderName`), passed
 *   down by the server component that loaded it. Without it the detail and
 *   edit screens fall back to the id in the URL — a cuid in the breadcrumb is
 *   ugly, a broken screen is worse.
 */
export function describeAdminRoute(
  pathname: string,
  name?: string | null,
): AdminRouteChrome {
  const [, section = "", second = "", third = ""] = pathname.split("/").filter(Boolean);

  if (!section) return { path: ADMIN_CWD, command: "ls", back: "/" };

  const known = SECTIONS[section];
  const rest = [section, second, third].filter(Boolean);
  const unknown: AdminRouteChrome = {
    path: `${ADMIN_CWD}/${rest.join("/")}`,
    command: "ls",
    back: ADMIN_HOME,
  };
  if (!known) return unknown;

  const base = `${ADMIN_HOME}/${section}`;
  const here = `${ADMIN_CWD}/${section}`;

  // `/admin/<section>` — the listing.
  if (!second) return { path: here, command: known.list, back: ADMIN_HOME };

  if (!third) {
    // `/admin/applications/board` — another view of the same directory, so it
    // keeps the section's path and, being a listing, goes back to `~/admin`.
    const view = known.views?.[second];
    if (view) return { path: here, command: view, back: ADMIN_HOME };

    // `/admin/<section>/new`
    if (second === "new" && known.create) {
      return { path: `${here}/new`, command: known.create, back: base };
    }

    // `/admin/<section>/<id>`
    if (known.detail) {
      const label = label_(name, second);
      return { path: `${here}/${label}`, command: known.detail(label), back: base };
    }
    return unknown;
  }

  // `/admin/<section>/<id>/edit`
  if (third === "edit" && known.edit) {
    const label = label_(name, second);
    return {
      path: `${here}/${label}`,
      command: known.edit(label),
      // Back to the detail screen when the section has one, else the listing.
      back: known.detail ? `${base}/${second}` : base,
    };
  }

  return unknown;
}

/** The natural key when the page supplied one, the URL id otherwise. */
function label_(name: string | null | undefined, id: string): string {
  return name?.trim() || id;
}
