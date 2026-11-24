"use client";

import { useId, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { HoloIconButton } from "./button";
import { HoloFrame } from "./frame";
import styles from "./holo.module.css";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * A window, on the native <dialog>: the top layer makes everything behind it
 * inert and keeps it inside `.site-root`, so it needs no portal. Closes with
 * `Esc`, its button or a click outside, and hands the focus back to whoever
 * had it when it opened.
 */
export function HoloDialog({
  open,
  onClose,
  title,
  closeLabel,
  width,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  /** Maximum width, in px. */
  width?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pressedOutside = useRef(false);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open || dialog.open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      // Browsers hand the focus back too, but not when the dialog left the
      // document first, and not to the same element everywhere.
      opener.current?.focus();
      opener.current = null;
    };
  }, [open]);

  // `showModal` keeps the focus away from the page, not from the browser's own
  // controls: past the last element, Tab would leave the window.
  const keepInside = (event: KeyboardEvent<HTMLDialogElement>) => {
    const dialog = ref.current;
    if (event.key !== "Tab" || !dialog) return;
    const stops = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => element.checkVisibility?.() ?? true,
    );
    const from = event.shiftKey ? stops[0] : stops[stops.length - 1];
    const to = event.shiftKey ? stops[stops.length - 1] : stops[0];
    const active = document.activeElement;
    if (active !== from && active !== dialog && dialog.contains(active)) return;
    event.preventDefault();
    to?.focus();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={styles.dialog}
      style={width ? ({ "--window-width": `${width}px` } as CSSProperties) : undefined}
      onKeyDown={keepInside}
      onCancel={(event) => {
        // The parent decides: `open` is the state, the element follows it.
        if (event.target !== ref.current) return;
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        // Closed without `cancel` (an engine may refuse the second Esc). The
        // event comes late: by then the window may already be open again.
        if (event.target === ref.current && open && !ref.current.open) onClose();
      }}
      // The box has no padding, so the element itself is only hit outside it.
      // Both ends of the click have to be there: releasing a text selection
      // outside the window must not close it.
      onPointerDown={(event) => {
        pressedOutside.current = event.target === ref.current;
      }}
      onClick={(event) => {
        if (event.target === ref.current && pressedOutside.current) onClose();
      }}
    >
      {open && (
        <div className={clsx(styles.holo, styles.panel, styles.window, className)}>
          <span className={styles.windowPlate} aria-hidden="true" />
          <HoloFrame kind="panel" seed={title} />
          <div className={styles.windowHead}>
            <h2 id={titleId} className={styles.windowTitle}>
              {title}
            </h2>
            <HoloIconButton label={closeLabel} size="sm" onClick={onClose}>
              <X aria-hidden="true" />
            </HoloIconButton>
          </div>
          <div className={styles.windowBody}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
