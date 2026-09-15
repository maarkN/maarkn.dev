import type { Command } from "./types";

export type Registry = {
  register: (command: Command) => void;
  /** `from` resolves to the command registered as `to`. Targets may be registered later. */
  alias: (from: string, to: string) => void;
  /** Case-insensitive lookup, aliases first. */
  resolve: (name: string) => Command | undefined;
  /** Commands in registration order. */
  list: () => readonly Command[];
  /** Command names in registration order (the autocomplete pool). Aliases are not included. */
  names: () => readonly string[];
};

/** Menu shortcuts and vocabulary aliases from the mockup. */
export const TERMINAL_ALIASES: Readonly<Record<string, string>> = {
  "1": "whoami",
  "2": "experience",
  "3": "skills",
  "4": "projects",
  "5": "writing",
  "6": "contact",
  "?": "help",
  h: "help",
  about: "whoami",
  work: "projects",
  blog: "writing",
  posts: "writing",
  stack: "skills",
  career: "experience",
  resume: "cv",
};

export function createRegistry(
  commands: Iterable<Command> = [],
  aliases: Readonly<Record<string, string>> = {},
): Registry {
  const byName = new Map<string, Command>();
  const byAlias = new Map<string, string>();

  const registry: Registry = {
    register(command) {
      byName.set(command.name.toLowerCase(), command);
    },
    alias(from, to) {
      byAlias.set(from.toLowerCase(), to.toLowerCase());
    },
    resolve(name) {
      const key = name.toLowerCase();
      return byName.get(byAlias.get(key) ?? key);
    },
    list: () => [...byName.values()],
    names: () => [...byName.keys()],
  };

  for (const command of commands) registry.register(command);
  for (const [from, to] of Object.entries(aliases)) registry.alias(from, to);

  return registry;
}
