import { useId, type ReactNode } from "react";
import clsx from "clsx";
import { HoloFrame } from "./frame";
import styles from "./holo.module.css";

/** A window that is the page: the frame of `HoloDialog`, without anything behind it to go back to. */
export function HoloWindow({
  title,
  heading: Title = "h1",
  className,
  children,
}: {
  title: string;
  heading?: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={clsx(styles.holo, styles.panel, styles.window, className)}>
      <span className={styles.windowPlate} aria-hidden="true" />
      <HoloFrame kind="panel" seed={title} />
      <div className={styles.windowHead}>
        <Title id={id} className={styles.windowTitle}>
          {title}
        </Title>
      </div>
      <div className={styles.windowBody}>{children}</div>
    </section>
  );
}
