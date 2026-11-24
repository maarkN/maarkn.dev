import type { ComponentProps } from "react";
import Link from "next/link";
import clsx from "clsx";
import { controlClass, type HoloSize, type HoloVariant } from "./button";
import { HoloFrame } from "./frame";
import { textOf } from "./text";
import styles from "./holo.module.css";

/** A framed link: looks and answers like the button. `disabled` takes the target away. */
export function HoloLink({
  size,
  variant,
  seed,
  disabled = false,
  className,
  children,
  href,
  ...props
}: ComponentProps<typeof Link> & {
  size?: HoloSize;
  variant?: HoloVariant;
  seed?: string;
  disabled?: boolean;
}) {
  const shared = { "data-holo": "", className: controlClass({ size, variant, className }) };
  const frame = <HoloFrame seed={seed ?? textOf(children)} />;
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

/** A link inside running text: the beam, an underline that thickens. Never a frame. */
export function BeamLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={clsx(styles.beam, className)} />;
}
