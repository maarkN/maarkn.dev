"use client";

import type { MouseEvent, ReactNode, Ref } from "react";
import s from "./terminal.module.css";

/**
 * Scrollable output area. A click on empty space (not on a link/button and
 * with no active text selection) hands focus back to the prompt.
 */
export function Screen({
  children,
  onFocusRequest,
  ref,
}: {
  children: ReactNode;
  onFocusRequest: () => void;
  ref?: Ref<HTMLElement>;
}) {
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as Element;
    if (target.closest("a, button, input, textarea, select")) return;
    if (window.getSelection()?.toString()) return;
    onFocusRequest();
  };

  return (
    <main ref={ref} className={s.screen} onClick={handleClick}>
      <div className={s.inner}>{children}</div>
    </main>
  );
}
