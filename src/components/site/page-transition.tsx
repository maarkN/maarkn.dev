"use client";

import { useSyncExternalStore, ViewTransition, type ReactNode } from "react";

const never = () => () => {};

/**
 * A page fades into the next one when the navigation commits (the classes are in
 * site.css); without support for View Transitions, it is replaced at once. Only
 * the page takes part: an update of the top is not a passage.
 *
 * Not in the HTML of the server: there, the class would make the browser fade
 * the first load too, whenever React streams part of it, and nothing answers
 * while that lasts.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(never, () => true, () => false);
  return (
    <ViewTransition default="none" update={hydrated ? "site-page" : "none"}>
      {children}
    </ViewTransition>
  );
}
