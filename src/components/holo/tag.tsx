import type { ComponentProps } from "react";
import Link from "next/link";
import clsx from "clsx";
import { HoloFrame } from "./frame";
import { textOf } from "./text";
import styles from "./holo.module.css";

/**
 * The label of a section, and the rail item it becomes. Always a link to the
 * section; `current` marks the one on screen.
 */
export function HoloTag({
  place = "rail",
  current = false,
  seed,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  place?: "section" | "rail";
  current?: boolean;
  seed?: string;
}) {
  return (
    <Link
      {...props}
      aria-current={current ? "location" : undefined}
      data-holo=""
      className={clsx(
        styles.holo,
        styles.control,
        styles.tag,
        place === "section" ? styles.tagSection : styles.tagRail,
        className,
      )}
    >
      <HoloFrame seed={seed ?? textOf(children)} />
      <span className={styles.label}>{children}</span>
    </Link>
  );
}
