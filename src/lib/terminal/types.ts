import type { ReactNode } from "react";
import type { ThemeApi } from "@/components/theme-provider";
import type { TerminalLabels } from "@/components/terminal/types";

/** One line a command prints. `""` renders as a blank line. */
export type OutputLine = ReactNode | "";

/** What `Command.run` resolves to: lines to print, or nothing. */
export type CommandResult = OutputLine[] | null | undefined | void;

/** Options for the interactive prompt (`ctx.ask`), implemented in change 10. */
export type AskOptions = {
  mask?: boolean;
  inputMode?: "text" | "email";
  enterKeyHint?: "next" | "send" | "go";
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
  /** Interactive prompt: swaps the PS1 for `label` and resolves on Enter. */
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
