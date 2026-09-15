import s from "./terminal.module.css";
import type { TerminalLabels } from "./types";

type Numbers = {
  years: { value: string };
  projects: { value: string };
};

/**
 * Message of the day (server component). Numbers come from
 * `dict.bigNumbers.items` so the terminal and the rest of the site never drift.
 */
export function Motd({
  labels,
  numbers,
}: {
  labels: TerminalLabels["motd"];
  numbers: Numbers;
}) {
  const summary = labels.summary
    .replace("{years}", numbers.years.value)
    .replace("{products}", numbers.projects.value);

  return (
    <div className={s.motd}>
      {/* The page's one heading: the tagline (the shell has no other title). */}
      <h1 className={s.motdTag}>{labels.tagline}</h1>
      <p className={s.motdMeta}>
        <b>{labels.location}</b>
        <br />
        {summary}
        <br />
        {labels.languages}
        <br />
        <span className={s.status}>{labels.status}</span>
      </p>
    </div>
  );
}
