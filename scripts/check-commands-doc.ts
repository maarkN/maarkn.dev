/**
 * Commands documentation check — every command the terminal registers must
 * have a `### <name>` section in `.docs/design/commands.md`, and every alias
 * in `TERMINAL_ALIASES` must appear in that file's alias table.
 *
 *   pnpm docs:commands        (= pnpm exec tsx scripts/check-commands-doc.ts)
 *
 * The command modules import React components and CSS modules, so instead of
 * building the registry this scans their sources for `name: "<command>"`
 * literals — the same shape every `Command` object uses. `.docs/` is local
 * (gitignored), which is why this runs on demand rather than in `pnpm lint`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TERMINAL_ALIASES } from "../src/lib/terminal/registry";

const ROOT = process.cwd();
const DOC = join(ROOT, ".docs", "design", "commands.md");
const COMMAND_FILES = [
  "content-commands.tsx",
  "system-commands.tsx",
  "nav-commands.tsx",
  "ask-command.tsx",
  "mail-command.tsx",
].map((file) => join(ROOT, "src", "lib", "terminal", file));

/** `name: "whoami"` inside a Command literal (also `{ ...exit, name: "logout" }`). */
const NAME_LITERAL = /\bname:\s*"([a-z?]+)"/g;
/** `### open <n>` → `open`; only level-3 headings count as command sections. */
const HEADING = /^###\s+`?([a-z?]+)`?\b/gm;

function registeredCommands(): string[] {
  const names = new Set<string>();
  for (const file of COMMAND_FILES) {
    for (const match of readFileSync(file, "utf8").matchAll(NAME_LITERAL)) names.add(match[1]);
  }
  return [...names].sort();
}

function documentedCommands(doc: string): string[] {
  return [...doc.matchAll(HEADING)].map((match) => match[1]);
}

if (!existsSync(DOC)) {
  console.error(`check-commands-doc: ${DOC} not found (the .docs folder is local; see README).`);
  process.exit(1);
}

const doc = readFileSync(DOC, "utf8");
const registered = registeredCommands();
const documented = new Set(documentedCommands(doc));
const problems: string[] = [];

for (const name of registered) {
  if (!documented.has(name)) problems.push(`missing section "### ${name}"`);
}
for (const name of documented) {
  if (!registered.includes(name)) problems.push(`section "### ${name}" has no registered command`);
}

const aliasTable = doc.slice(doc.indexOf("## Aliases"), doc.indexOf("## Atalhos"));
for (const [alias, target] of Object.entries(TERMINAL_ALIASES)) {
  if (!registered.includes(target)) problems.push(`alias "${alias}" targets unknown command "${target}"`);
  if (!aliasTable.includes(`\`${alias}\``)) problems.push(`alias "${alias}" missing from the alias table`);
}

if (problems.length > 0) {
  console.error(`check-commands-doc: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}

console.log(
  `check-commands-doc: ${registered.length} commands and ${Object.keys(TERMINAL_ALIASES).length} aliases documented in .docs/design/commands.md`,
);
