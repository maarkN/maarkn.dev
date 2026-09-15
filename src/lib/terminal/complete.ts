/**
 * Tab completion. The first word completes against command names; after
 * `cat ` the last word completes against file names. Any other position is
 * left alone.
 */

export type Completion =
  /** Nothing to do (no candidates, or cursor in an unsupported position). */
  | { kind: "none" }
  /** Put this into the field (single match, or a longer common prefix). */
  | { kind: "replace"; value: string }
  /** Prefix cannot grow: show the candidates. */
  | { kind: "list"; candidates: string[] };

export function commonPrefix(items: readonly string[]): string {
  if (items.length === 0) return "";
  let common = items[0];
  for (const item of items) {
    while (!item.startsWith(common)) common = common.slice(0, -1);
  }
  return common;
}

export function complete(
  input: string,
  commands: readonly string[],
  files: readonly string[] = [],
): Completion {
  const parts = input.split(/\s+/);

  let pool: readonly string[];
  let prefix: string;
  let base: string;

  if (parts.length <= 1) {
    pool = commands;
    prefix = parts[0] ?? "";
    base = "";
  } else if (parts[0] === "cat") {
    pool = files;
    prefix = parts[parts.length - 1];
    base = parts.slice(0, -1).join(" ") + " ";
  } else {
    return { kind: "none" };
  }

  const candidates = pool.filter((name) => name.startsWith(prefix));
  if (candidates.length === 0) return { kind: "none" };
  if (candidates.length === 1) return { kind: "replace", value: `${base}${candidates[0]} ` };

  const common = commonPrefix(candidates);
  if (common.length > prefix.length) return { kind: "replace", value: base + common };

  return { kind: "list", candidates };
}
