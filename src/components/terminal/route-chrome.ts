/**
 * Maps an inner-page pathname to the terminal chrome it wears: the location
 * shown in the status bar, the fake command in the breadcrumb and where
 * `cd ..` goes. Pure so the page layout can derive everything from the URL.
 */
export type RouteChrome = {
  /** `~/projects/<slug>` */
  path: string;
  /** `cat projects/<slug>.md` */
  command: string;
  /** Target of the `cd ..` link. */
  back: string;
};

type Section = {
  /** Listing command, e.g. `ls projects/`. */
  list: string;
  /** Detail command for a slug. */
  detail: (slug: string) => string;
  /** Terminal command that shows the same list on the home; `cd ..` from the listing. */
  homeCommand: string;
};

const SECTIONS: Record<string, Section> = {
  projects: {
    list: "ls projects/",
    detail: (slug) => `cat projects/${slug}.md`,
    homeCommand: "projects",
  },
  career: {
    list: "ls career/",
    detail: (slug) => `cat career/${slug}.log`,
    homeCommand: "experience",
  },
  blog: {
    list: "ls blog/",
    detail: (slug) => `less blog/${slug}.md`,
    homeCommand: "writing",
  },
  links: {
    list: "cat links.sh",
    detail: () => "cat links.sh",
    homeCommand: "contact",
  },
};

export function describeRoute(pathname: string): RouteChrome {
  const [lang = "", section = "", slug = ""] = pathname.split("/").filter(Boolean);
  const home = `/${lang}`;
  const known = SECTIONS[section];

  if (!known) {
    const rest = [section, slug].filter(Boolean);
    return {
      path: rest.length ? `~/${rest.join("/")}` : "~",
      command: rest.length ? `cat ${rest.join("/")}.md` : "ls",
      back: home,
    };
  }

  if (slug) {
    return {
      path: `~/${section}/${slug}`,
      command: known.detail(slug),
      back: `${home}/${section}`,
    };
  }

  return {
    path: `~/${section}`,
    command: known.list,
    back: `${home}?cmd=${known.homeCommand}`,
  };
}
