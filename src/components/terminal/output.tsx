import { Line } from "./line";
import type { OutputEntry } from "./types";

/** Everything printed so far. Announced politely to assistive tech. */
export function Output({ lines }: { lines: OutputEntry[] }) {
  return (
    <div aria-live="polite">
      {lines.map((entry) => (
        <Line key={entry.id} index={entry.index} instant={entry.instant} cmd={entry.cmd}>
          {entry.line}
        </Line>
      ))}
    </div>
  );
}
