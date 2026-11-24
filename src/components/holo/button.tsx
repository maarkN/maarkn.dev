import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import { HoloFrame } from "./frame";
import { textOf } from "./text";
import styles from "./holo.module.css";

export type HoloSize = "sm" | "md" | "lg";
export type HoloVariant = "ghost" | "primary";

/** Classes of a framed control, shared by the button and the link. */
export function controlClass({
  size = "md",
  variant = "ghost",
  icon = false,
  className,
}: {
  size?: HoloSize;
  variant?: HoloVariant;
  icon?: boolean;
  className?: string;
}) {
  return clsx(
    styles.holo,
    styles.control,
    styles[size],
    variant === "primary" && styles.primary,
    icon && styles.icon,
    className,
  );
}

type Shape = {
  size?: HoloSize;
  variant?: HoloVariant;
  /** What the cut is derived from; the text by default. */
  seed?: string;
};

/** 34, 44 or 50px. `pressed` makes it a toggle. */
export function HoloButton({
  size,
  variant,
  seed,
  pressed,
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & Shape & { pressed?: boolean }) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={pressed}
      data-holo=""
      className={controlClass({ size, variant, className })}
    >
      <HoloFrame seed={seed ?? textOf(children)} />
      <span className={styles.label}>{children}</span>
    </button>
  );
}

/** Square, with an icon and no visible text: the name is mandatory. */
export function HoloIconButton({
  label,
  size = "md",
  variant,
  seed,
  className,
  children,
  ...props
}: Omit<ComponentProps<"button">, "aria-label"> & Shape & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      aria-label={label}
      data-holo=""
      className={controlClass({ size, variant, icon: true, className })}
    >
      <HoloFrame seed={seed ?? label} />
      <span className={styles.label}>{children}</span>
    </button>
  );
}
