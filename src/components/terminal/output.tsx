import { Line } from "./line";
import type { OutputEntry } from "./types";

type Group = { key: string; label?: string; entries: OutputEntry[] };

/** Consecutive lines printed by the same command run, in order. */
function groupByBlock(lines: OutputEntry[]): Group[] {
  const groups: Group[] = [];
  let current: Group | undefined;
  let block: number | undefined;
  for (const entry of lines) {
    if (!current || entry.block !== block) {
      block = entry.block;
      current = { key: block === undefined ? `u${entry.id}` : `b${block}`, entries: [] };
      groups.push(current);
    }
    current.entries.push(entry);
    // The resolved name arrives with the lines after the echo; keep the latest.
    if (entry.label) current.label = entry.label;
  }
  return groups;
}

/**
 * Everything printed so far. A polite live region announces what a command
 * adds (only additions: streamed rewrites would otherwise be read over and
 * over), and each run is its own labelled section (`output of help`) so a
 * screen reader can move between them. The entrance animation is visual
 * only — the text is in the DOM from the first render.
 */
export function Output({
  lines,
  /** `output of {cmd}` */
  outputOf,
}: {
  lines: OutputEntry[];
  outputOf: string;
}) {
  return (
    <div aria-live="polite" aria-relevant="additions">
      {groupByBlock(lines).map((group) => (
        <section
          key={group.key}
          aria-label={group.label ? outputOf.replace("{cmd}", group.label) : undefined}
        >
          {group.entries.map((entry) => (
            <Line key={entry.id} index={entry.index} instant={entry.instant} cmd={entry.cmd}>
              {entry.line}
            </Line>
          ))}
        </section>
      ))}
    </div>
  );
}
