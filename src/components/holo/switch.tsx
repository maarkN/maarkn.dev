import type { ComponentProps } from "react";
import clsx from "clsx";
import { HoloFrame } from "./frame";
import styles from "./holo.module.css";

/** On or off, at once. The visible label is inside the target and is the name. */
export function HoloSwitch({
  label,
  checked,
  onCheckedChange,
  className,
  ...props
}: Omit<ComponentProps<"button">, "onClick" | "role" | "children"> & {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      {...props}
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={clsx(styles.switch, className)}
    >
      <span className={clsx(styles.holo, styles.track)} data-holo="">
        <HoloFrame seed={label} />
        <span className={styles.thumb} />
      </span>
      {label}
    </button>
  );
}
