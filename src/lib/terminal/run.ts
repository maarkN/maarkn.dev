import type { History } from "./history";
import { parse } from "./parse";
import type { Registry } from "./registry";
import type { CommandContext, OutputLine } from "./types";

/** What the runner needs from the screen. The React hook implements it. */
export type RunnerIO = {
  /** Echo the typed line after the PS1 (instant, no entrance animation). */
  echo: (text: string) => void;
  /** Print a batch of lines with the staggered entrance. */
  print: (lines: OutputLine[]) => void;
  /** Append one line while a command is still running. */
  printLine: (line: OutputLine) => void;
  replaceLast: (line: OutputLine) => void;
  clear: () => void;
  /** A command resolved and ran; the menu marks it as done. */
  markDone: (name: string) => void;
};

/** The parts of the context the host provides; the runner fills in the rest. */
export type BaseContext = Omit<
  CommandContext,
  "history" | "commands" | "clear" | "print" | "replaceLast" | "signal"
>;

/** Messages the runner prints itself. */
export type RunnerFormat = {
  notFound: (name: string, ctx: BaseContext) => OutputLine[];
  failed: (name: string, error: unknown, ctx: BaseContext) => OutputLine[];
};

export type Runner = {
  /**
   * Echo + parse + resolve + execute. `base` carries the late-bound values
   * (theme, dictionary, navigation) as they are at this moment. Resolves once
   * the command has finished.
   */
  run: (raw: string, base: BaseContext) => Promise<void>;
  /** Cancel the running command (Ctrl+C). Nothing else changes on screen. */
  abort: () => void;
  /** Cancel the running command and wipe the screen (Ctrl+L, `clear`). */
  clear: () => void;
  readonly running: boolean;
};

export function createRunner({
  registry,
  history,
  io,
  format,
}: {
  registry: Registry;
  history: History;
  io: RunnerIO;
  format: RunnerFormat;
}): Runner {
  let current: AbortController | null = null;

  const abort = () => {
    current?.abort();
    current = null;
  };

  const clear = () => {
    abort();
    io.clear();
  };

  async function run(raw: string, base: BaseContext) {
    const text = raw.trim();
    io.echo(text);

    const parsed = parse(text);
    if (!parsed) return;
    history.push(text);

    const command = registry.resolve(parsed.name);
    if (!command) {
      io.print(format.notFound(parsed.name, base));
      return;
    }
    io.markDone(command.name);

    // One command at a time: a new line cancels whatever was still streaming.
    abort();
    const controller = new AbortController();
    current = controller;
    const { signal } = controller;

    const ctx: CommandContext = {
      ...base,
      history: history.entries,
      commands: registry.list(),
      signal,
      clear,
      print: (line) => {
        if (!signal.aborted) io.printLine(line);
      },
      replaceLast: (line) => {
        if (!signal.aborted) io.replaceLast(line);
      },
    };

    try {
      const result = await command.run(parsed.args, ctx);
      if (signal.aborted) return;
      if (result && result.length > 0) io.print(result);
    } catch (error) {
      if (signal.aborted) return;
      io.print(format.failed(command.name, error, base));
    } finally {
      if (current === controller) current = null;
    }
  }

  return {
    run,
    abort,
    clear,
    get running() {
      return current !== null;
    },
  };
}
