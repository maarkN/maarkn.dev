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
  boot: {
    /** The six lines typed by the boot overlay (`[ok]` is painted green). */
    lines: string[];
    skip: string;
  };
  help: {
    heading: string;
    alsoTry: string;
    shortcuts: string;
    /** Per-command description, keyed by command name. */
    describe: Record<string, string>;
    /** Dim suffix after the description (`· open <n> reads a case`). */
    hints: Record<string, string>;
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
    opening: string;
  };
  /*
   * Content commands. Templates use `{name}` for values the command fills in
   * and `{{text}}` for a dim aside; see `lib/terminal/rich.tsx`.
   */
  whoami: {
    role: string;
    location: string;
    paragraphs: string[];
    stats: { years: string; products: string; stacks: string; countries: string };
    footer: string;
  };
  experience: { footer: string };
  skills: { header: string };
  projects: { header: string; footer: string };
  writing: { empty: string; footer: string };
  contact: {
    header: string;
    timezone: string;
    available: string;
    unavailable: string;
    statusNote: string;
    timezoneValue: string;
    footer: string;
  };
  neofetch: {
    host: string;
    uptime: string;
    shell: string;
    kernel: string;
    packages: string;
    editor: string;
    status: string;
  };
  /** Inner-page labels the content commands share (headers, link labels). */
  pages: {
    career: { header: string; readCase: string };
    writing: { header: string };
    links: {
      labels: {
        email: string;
        linkedin: string;
        github: string;
        whatsapp: string;
        cv: string;
        status: string;
      };
    };
  };
  errors: {
    catMissing: string;
    catNoSuch: string;
    tryLs: string;
    openRange: string;
    seeProjects: string;
    readRange: string;
    seeWriting: string;
  };
};
