import Link from "next/link";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import s from "./terminal.module.css";

/*
 * Typed replacements for the mockup's global one-letter classes
 * (`.c .g .p .o .k .y .r .d .b`). Server- and client-safe.
 */

type Kids = { children?: ReactNode };

/** cyan */
export function C({ children }: Kids) {
  return <span className={s.c}>{children}</span>;
}
/** green */
export function G({ children }: Kids) {
  return <span className={s.g}>{children}</span>;
}
/** purple */
export function P({ children }: Kids) {
  return <span className={s.p}>{children}</span>;
}
/** orange */
export function O({ children }: Kids) {
  return <span className={s.o}>{children}</span>;
}
/** pink */
export function K({ children }: Kids) {
  return <span className={s.k}>{children}</span>;
}
/** yellow */
export function Y({ children }: Kids) {
  return <span className={s.y}>{children}</span>;
}
/** red */
export function R({ children }: Kids) {
  return <span className={s.r}>{children}</span>;
}
/** dim / comment */
export function D({ children }: Kids) {
  return <span className={s.d}>{children}</span>;
}
/** bold foreground */
export function B({ children }: Kids) {
  return <span className={s.b}>{children}</span>;
}

/**
 * A command or file name quoted inside prose (`type help`, `try ls`): cyan
 * like `C`, but as `<code lang="en">` so screen readers reading pt-BR text
 * pronounce it as the English word it is. `rich()` renders `` `name` `` with it.
 */
export function Cmd({ children }: Kids) {
  return (
    <code lang="en" className={s.cmdName}>
      {children}
    </code>
  );
}

/* ── Row: label column + content ───────────────────────────────── */

export type RowWidth = "w4" | "w9" | "w10" | "w12" | "w18" | "w22";

export function Row({
  label,
  width,
  entry,
  children,
}: {
  label: ReactNode;
  /** Label column width; defaults to 18ch (mockup `--rl`). */
  width?: RowWidth;
  /** Adds the bottom margin used by list entries. */
  entry?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={clsx(s.row, width && s[width], entry && s.entry)}>
      <span className={s.rl}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

/* ── Bar: 20-cell progress meter ───────────────────────────────── */

export function Bar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const filled = Math.round(pct / 5);
  return (
    <>
      <P>{"█".repeat(filled)}</P>
      <D>{"░".repeat(20 - filled)}</D> <Y>{pct}%</Y>
    </>
  );
}

/* ── A: link that picks next/link vs. external anchor by href ──── */

const isHttp = (href: string) => /^https?:\/\//i.test(href);

export function A({
  href,
  quiet,
  external,
  children,
}: {
  href: string;
  /** Dim variant (mockup `a.q`). */
  quiet?: boolean;
  /** Open in a new tab even for a same-origin path (static files like the CV). */
  external?: boolean;
  /** Defaults to the href without its protocol. */
  children?: ReactNode;
}) {
  const className = clsx(s.link, quiet && s.quiet);
  const label = children ?? href.replace(/^https?:\/\//i, "");

  if (href.startsWith("/") && !external) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      {...(isHttp(href) || external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </a>
  );
}
