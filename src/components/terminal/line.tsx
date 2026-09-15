import type { CSSProperties } from "react";
import { clsx } from "clsx";
import s from "./terminal.module.css";
import type { OutputLine } from "./types";

/** Longest stagger a line in a batch waits before its entrance (mockup). */
const MAX_DELAY_MS = 480;
const STEP_MS = 22;

export function Line({
  children,
  index = 0,
  instant = false,
  cmd = false,
}: {
  children: OutputLine;
  /** Position inside the printed batch; drives the entrance delay. */
  index?: number;
  /** Skip the entrance animation (echoed prompt lines). */
  instant?: boolean;
  /** Echoed command line: gets the extra top margin. */
  cmd?: boolean;
}) {
  const style: CSSProperties | undefined = instant
    ? undefined
    : { animationDelay: `${Math.min(index * STEP_MS, MAX_DELAY_MS)}ms` };

  return (
    <div className={clsx(s.line, instant && s.now, cmd && s.cmd)} style={style}>
      {children === "" ? " " : children}
    </div>
  );
}
