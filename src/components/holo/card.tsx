import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { HoloFrame } from "./frame";
import styles from "./holo.module.css";

/** A card goes somewhere (`href`) or does something (`onClick`): one of the two. */
type Action =
  | { href: string; onClick?: undefined }
  | { href?: undefined; onClick: () => void };

type Heading = "h2" | "h3" | "h4";

type CardProps = Action & {
  /** The card's accessible name, as visible text. */
  title: string;
  heading?: Heading;
  seed?: string;
  className?: string;
  children?: ReactNode;
};

/** The one target of a card, stretched over all of it. */
function Stretched({ href, onClick, title }: Action & { title: string }) {
  return href !== undefined ? (
    <Link href={href} className={styles.stretched}>
      {title}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={styles.stretched}>
      {title}
    </button>
  );
}

export function HoloCard({ title, heading: Title = "h3", seed, className, children, ...action }: CardProps) {
  return (
    <article className={clsx(styles.holo, styles.panel, styles.card, className)} data-holo="card">
      <span className={styles.cone} aria-hidden="true" />
      <div className={styles.tilt}>
        <HoloFrame kind="panel" seed={seed ?? title} echo />
        <div className={styles.content}>
          <Title className={styles.cardTitle}>
            <Stretched {...action} title={title} />
          </Title>
          {children}
        </div>
      </div>
    </article>
  );
}

/**
 * Projected screen: a card whose body is an image, cut parallel to the frame.
 * The image never zooms; the light that comes down and the moving inner border
 * exist only while the pointer or the focus is here.
 */
export function HoloScreen({
  title,
  heading: Title = "h3",
  media,
  seed,
  className,
  children,
  ...action
}: CardProps & {
  /** An <img> or next/image, with its own `alt` and its width and height. */
  media: ReactNode;
}) {
  return (
    <article className={clsx(styles.holo, styles.panel, styles.card, styles.screen, className)} data-holo="card">
      <div className={styles.tilt}>
        <HoloFrame kind="panel" seed={seed ?? title} echo />
        <div className={styles.media}>
          {media}
          <span className={styles.scan} aria-hidden="true" />
        </div>
      </div>
      <div className={styles.caption}>
        <Title className={styles.cardTitle}>
          <Stretched {...action} title={title} />
        </Title>
        {children}
      </div>
    </article>
  );
}
