import type { OutputLine } from "@/lib/terminal/types";

export type { OutputLine };

/**
 * A printed line as the shell keeps it. `index` is the position inside the
 * batch it was printed with (drives the staggered entrance delay), `instant`
 * skips the animation and `cmd` marks an echoed prompt line.
 */
export type OutputEntry = {
  id: number;
  line: OutputLine;
  index: number;
  instant?: boolean;
  cmd?: boolean;
};

export type MenuItemName =
  | "whoami"
  | "experience"
  | "skills"
  | "projects"
  | "writing"
  | "contact"
  | "help"
  | "clear";

/** `dict.terminal` — every visible string of the shell. */
export type TerminalLabels = {
  bar: {
    title: string;
    theme: string;
    font: string;
    themeTitle: string;
    fontTitle: string;
  };
  menu: {
    title: string;
    label: string;
  };
  motd: {
    tagline: string;
    location: string;
    summary: string;
    languages: string;
    status: string;
  };
  prompt: {
    label: string;
  };
  hint: string;
  help: {
    heading: string;
    alsoTry: string;
    shortcuts: string;
    /** Per-command description, keyed by command name. */
    describe: Record<string, string>;
  };
  messages: {
    notFound: string;
    typeHelp: string;
    failed: string;
    noHistory: string;
    themeSoft: string;
    themeClassic: string;
    fontUnavailable: string;
    uptime: string;
    uptimeLoad: string;
    whereami: string;
    sudoPassword: string;
    sudoDenied: string;
    sudoReported: string;
    rmDenied: string;
    rmNiceTry: string;
    exit: string;
    exitJoke: string;
  };
};
