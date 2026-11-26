"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert, X } from "lucide-react";
import { HoloButton, HoloIconButton } from "./button";
import styles from "./holo.module.css";

export type NoticeTone = "info" | "ok" | "warn" | "bad";

const ICONS = { info: Info, ok: CircleCheck, warn: TriangleAlert, bad: CircleX };

/**
 * A notice: content, so it is solid; only its buttons are holograms. Announced
 * politely, or at once when it is an error. With `duration` it leaves on its
 * own, and waits while the pointer or the focus is on it.
 *
 * `announce={false}` is for a notice that lands in a live region that already
 * exists (the backoffice's notices): a second one inside it would be read twice.
 */
export function HoloNotice({
  tone = "info",
  title,
  children,
  action,
  announce = true,
  lang,
  onDismiss,
  dismissLabel,
  duration,
}: {
  tone?: NoticeTone;
  title: string;
  children?: ReactNode;
  /** The next step the result offers: undo it, try it again. */
  action?: { label: string; onClick: () => void };
  announce?: boolean;
  /** The language of its words, when it is not the document's. */
  lang?: string;
  /** Milliseconds until it leaves; only with `onDismiss`. */
  duration?: number;
} & (
  | { onDismiss: () => void; dismissLabel: string }
  | { onDismiss?: undefined; dismissLabel?: undefined }
)) {
  const Icon = ICONS[tone];
  const [pointed, setPointed] = useState(false);
  const [focused, setFocused] = useState(false);
  const held = pointed || focused;
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!duration || held) return;
    const timer = setTimeout(() => dismiss.current?.(), duration);
    return () => clearTimeout(timer);
  }, [duration, held]);

  return (
    <div
      role={announce ? (tone === "bad" ? "alert" : "status") : undefined}
      lang={lang}
      data-tone={tone}
      className={styles.notice}
      onPointerEnter={() => setPointed(true)}
      onPointerLeave={() => setPointed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <Icon aria-hidden="true" />
      <div className={styles.noticeText}>
        <p className={styles.noticeTitle}>{title}</p>
        {children}
        {action && (
          <HoloButton size="sm" className={styles.noticeAction} onClick={action.onClick}>
            {action.label}
          </HoloButton>
        )}
      </div>
      {onDismiss && (
        <HoloIconButton label={dismissLabel} size="sm" onClick={onDismiss}>
          <X aria-hidden="true" />
        </HoloIconButton>
      )}
    </div>
  );
}
