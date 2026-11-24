"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert, X } from "lucide-react";
import { HoloIconButton } from "./button";
import styles from "./holo.module.css";

export type NoticeTone = "info" | "ok" | "warn" | "bad";

const ICONS = { info: Info, ok: CircleCheck, warn: TriangleAlert, bad: CircleX };

/**
 * A notice: content, so it is solid; only its button is a hologram. Announced
 * politely, or at once when it is an error. With `duration` it leaves on its
 * own, and waits while the pointer or the focus is on it.
 */
export function HoloNotice({
  tone = "info",
  title,
  children,
  onDismiss,
  dismissLabel,
  duration,
}: {
  tone?: NoticeTone;
  title: string;
  children?: ReactNode;
  /** Milliseconds until it leaves; only with `onDismiss`. */
  duration?: number;
} & (
  | { onDismiss: () => void; dismissLabel: string }
  | { onDismiss?: undefined; dismissLabel?: undefined }
)) {
  const Icon = ICONS[tone];
  const [held, setHeld] = useState(false);
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
      role={tone === "bad" ? "alert" : "status"}
      data-tone={tone}
      className={styles.notice}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <Icon aria-hidden="true" />
      <div className={styles.noticeText}>
        <p className={styles.noticeTitle}>{title}</p>
        {children}
      </div>
      {onDismiss && (
        <HoloIconButton label={dismissLabel} size="sm" onClick={onDismiss}>
          <X aria-hidden="true" />
        </HoloIconButton>
      )}
    </div>
  );
}
