import type { ComponentProps } from "react";
import Link from "next/link";
import clsx from "clsx";
import { controlClass, type HoloSize, type HoloVariant } from "./button";
import { HoloFrame } from "./frame";
import { textOf } from "./text";
import styles from "./holo.module.css";

type Shape = {
  size?: HoloSize;
  variant?: HoloVariant;
  seed?: string;
  disabled?: boolean;
  /** Square, with an icon and no visible text: `aria-label` is then mandatory. */
  icon?: boolean;
};

/** A framed link: looks and answers like the button. `disabled` takes the target away. */
export function HoloLink({
  size,
  variant,
  seed,
  disabled = false,
  icon,
  className,
  children,
  href,
  ...props
}: ComponentProps<typeof Link> & Shape) {
  const shared = { "data-holo": "", className: controlClass({ size, variant, icon, className }) };
  const frame = <HoloFrame seed={seed ?? (textOf(children) || String(props["aria-label"] ?? ""))} />;
  if (disabled) {
    return (
      <a {...shared} role="link" aria-disabled="true">
        {frame}
        <span className={styles.label}>{children}</span>
      </a>
    );
  }
  return (
    <Link {...props} {...shared} href={href}>
      {frame}
      <span className={styles.label}>{children}</span>
    </Link>
  );
}

/** The same, for what is not a client navigation: a file, or another document of this site. */
export function HoloAnchor({
  size,
  variant,
  seed,
  icon,
  className,
  children,
  ...props
}: ComponentProps<"a"> & Omit<Shape, "disabled">) {
  return (
    <a {...props} data-holo="" className={controlClass({ size, variant, icon, className })}>
      <HoloFrame seed={seed ?? (textOf(children) || String(props["aria-label"] ?? ""))} />
      <span className={styles.label}>{children}</span>
    </a>
  );
}

/** A link inside running text: the beam, an underline that thickens. Never a frame. */
export function BeamLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={clsx(styles.beam, className)} />;
}
