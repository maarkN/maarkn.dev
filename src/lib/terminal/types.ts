import type { ReactNode } from "react";
import type { ThemeApi } from "@/components/theme-provider";
import type { TerminalLabels } from "@/components/terminal/types";
import type {
  ExperienceItem,
  ProjectListItem,
  ProjectListLabels,
  WritingItem,
} from "./listings";

/** One line a command prints. `""` renders as a blank line. */
export type OutputLine = ReactNode | "";

/** What `Command.run` resolves to: lines to print, or nothing. */
export type CommandResult = OutputLine[] | null | undefined | void;

/** Options for the interactive prompt (`ctx.ask`). */
export type AskOptions = {
  /** Echo and display the answer as bullets (passwords). */
  mask?: boolean;
  inputMode?: "text" | "email";
  enterKeyHint?: "next" | "send" | "go";
  /** `Shift+Enter` adds a line (shown with a `… ` continuation) instead of answering. */
  multiline?: boolean;
  /** Replaces the hint under the prompt while this question is pending. */
  hint?: string;
};

/**
 * Site content the content commands format, resolved for the locale on the
 * server (`lib/terminal/data.ts`) and handed to the shell as a serialisable
 * prop: only strings, numbers and plain arrays, never functions or dates.
 */
export type TerminalData = {
  /** `dict.bigNumbers.items` values, as displayed on the home. */
  numbers: { years: string; products: string; stacks: string; countries: string };
  /** Timeline merged with the dictionary copy, newest first. */
  experience: ExperienceItem[];
  skills: {
    /** Toolkit groups in `groupOrder`; `key` is the locale-agnostic label. */
    groups: { key: string; items: string[] }[];
    /** Capability metrics with their translated label. */
    metrics: { label: string; value: number }[];
  };
  /** Featured projects with the tagline already resolved. */
  projects: ProjectListItem[];
  projectLabels: ProjectListLabels;
  /** Latest posts (at most 6); empty when the CMS has nothing. */
  posts: WritingItem[];
  /** `dict.blog.readingTime`, e.g. "min read". */
  minRead: string;
};

/** What the shell uses when no data is provided (tests, previews). */
export const EMPTY_TERMINAL_DATA: TerminalData = {
  numbers: { years: "", products: "", stacks: "", countries: "" },
  experience: [],
  skills: { groups: [], metrics: [] },
  projects: [],
  projectLabels: {
    categories: { web: "web", mobile: "mobile", ai: "ai", backend: "backend", client: "client" },
    statuses: { live: "live", internal: "internal", nda: "nda", archived: "archived" },
  },
  posts: [],
  minRead: "min read",
};

/**
 * Everything a command may touch. Commands never see React state: they get
 * data (`locale`, `dict`, `history`), controls (`theme`, `navigate`, `clear`)
 * and an output channel (`print`/`replaceLast`) that lets long-running
 * commands stream lines while they run. `signal` aborts when the visitor
 * clears the screen, hits Ctrl+C or starts another command.
 */
export type CommandContext = {
  locale: string;
  dict: TerminalLabels;
  /** Site content for the content commands (whoami, projects, …). */
  data: TerminalData;
  theme: ThemeApi;
  navigate: (href: string) => void;
  openExternal: (url: string) => void;
  /** Session history, newest last; already includes the running command. */
  history: readonly string[];
  /** Registered commands, in registration order (drives `help`). */
  commands: readonly Command[];
  clear: () => void;
  reboot: () => void;
  /** Append one line now, before the command resolves. */
  print: (line: OutputLine) => void;
  /** Replace the most recent line (streaming / progress). */
  replaceLast: (line: OutputLine) => void;
  signal: AbortSignal;
  /** Mutable per-session scratch space shared by commands (e.g. last list). */
  state: Record<string, unknown>;
  /**
   * Interactive prompt: swaps the PS1 for `→ label ` and resolves with the
   * answer on Enter. Rejects with an `AbortError` (see `isAbortError`) when
   * the visitor presses `Esc`/`Ctrl+C` or the command is aborted. Answers are
   * never recorded in the history. Absent on hosts without a prompt.
   */
  ask?: (label: string, options?: AskOptions) => Promise<string>;
};

export type Command = {
  /** Lowercase name the visitor types. */
  name: string;
  /** Shown instead of the name in `help` (e.g. `cat <file>`). */
  usage?: string;
  describe: ReactNode;
  /** Left out of the `help` table but still listed under "also try". */
  hidden?: boolean;
  /** Never mentioned by `help` (easter eggs and duplicates like `cls`). */
  secret?: boolean;
  run: (args: string[], ctx: CommandContext) => CommandResult | Promise<CommandResult>;
};
