/* eslint-disable react/jsx-key -- every OutputLine is rendered on its own
   inside <Line>, never as a React child array, so keys are meaningless here. */
import { A, C, D } from "@/components/terminal/primitives";
import type { TerminalLabels } from "@/components/terminal/types";
import {
  isTerminalLocale,
  otherLocale,
  parseLocaleArg,
  rememberLocale,
  switchLocale,
  type TerminalLocale,
} from "./locale";
import { rich } from "./rich";
import type { Command } from "./types";

/*
 * Moving around from the prompt: `cd <dir>` opens an inner route, `cd`/`cd ~`
 * comes back home, `pwd` says where we are and `lang` switches the locale.
 * Registered by the host after the content commands and before the system
 * ones; all three stay out of the `help` table (listed under "also try").
 */

/** What `pwd` prints — `~` in the PS1 stands for it. */
const HOME_DIR = "/home/maarkn";

/** Directory names the visitor may `cd` into, resolved to inner routes. */
const DIRECTORIES: Readonly<Record<string, string>> = {
  projects: "projects",
  career: "career",
  blog: "blog",
  links: "links",
  // The vocabulary the terminal already uses for the same things.
  work: "projects",
  experience: "career",
  writing: "blog",
  posts: "blog",
  contact: "links",
};

/** Directory names in `cd` order (the Tab completion pool after `cd `). */
export const DIRECTORY_NAMES: readonly string[] = ["projects", "career", "blog", "links"];

/** `~/projects/` → `projects`; `~` and `` → `` (home). */
function normalizeDir(arg: string | undefined): string {
  return (arg ?? "")
    .trim()
    .replace(/^~\/?/, "")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
}

/** `/en?cmd=skills` as the browser shows it; empty outside the browser. */
function currentLocation(): { pathname: string; search: string } {
  if (typeof window === "undefined") return { pathname: "", search: "" };
  return { pathname: window.location.pathname, search: window.location.search };
}

export function createNavCommands(labels: TerminalLabels): Command[] {
  const { help, messages, nav } = labels;
  const describe = (name: string) => help.describe[name] ?? name;

  const cd: Command = {
    name: "cd",
    usage: "cd <dir>",
    describe: describe("cd"),
    hidden: true,
    run: ([arg], ctx) => {
      const dir = normalizeDir(arg);
      const home = `/${ctx.locale}`;

      if (dir === "") {
        const { pathname, search } = currentLocation();
        if (pathname !== home || search) ctx.navigate(home);
        return null;
      }
      if (dir === ".." || dir === "../" || dir === "-") return [<D>{nav.alreadyHome}</D>];

      const route = DIRECTORIES[dir.toLowerCase()];
      if (!route) return [rich(nav.noSuchDirectory, { dir: arg ?? "" })];

      const href = `${home}/${route}`;
      ctx.navigate(href);
      return [
        <>
          {messages.opening} <A href={href}>~/{route}</A>
        </>,
      ];
    },
  };

  const pwd: Command = {
    name: "pwd",
    describe: describe("pwd"),
    hidden: true,
    run: () => [HOME_DIR],
  };

  const lang: Command = {
    name: "lang",
    usage: "lang",
    describe: describe("lang"),
    hidden: true,
    run: ([arg], ctx) => {
      const current: TerminalLocale = isTerminalLocale(ctx.locale) ? ctx.locale : "en";
      const wanted = parseLocaleArg(arg);
      if (arg && !wanted) {
        return [
          <>
            {rich(nav.langUnknown, { value: arg })} <D>{rich(nav.langHint)}</D>
          </>,
        ];
      }
      const next = wanted ?? otherLocale(current);

      if (next !== current) switchLocale(next, ctx.navigate);
      else rememberLocale(next);
      return [
        <>
          lang → <C>{next}</C> <D>{nav.langNote[next]}</D>
        </>,
      ];
    },
  };

  return [cd, pwd, lang];
}
