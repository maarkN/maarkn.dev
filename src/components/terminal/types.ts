import type { ReactNode } from "react";

/** One line a command prints. `""` renders as a blank line. */
export type OutputLine = ReactNode | "";

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
};
