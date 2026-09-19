"use client";

import { useSyncExternalStore } from "react";

/**
 * Wall clock for the status bars: `--:--` on the server, `HH:mm` in the
 * visitor's zone on the client. Lives apart from `status-bar.tsx` because the
 * admin bar (`@/components/admin/terminal/admin-status-bar`) needs the same
 * clock without the theme controls — and must not pull `theme-provider` into
 * an `/admin/**` chunk.
 */

const SERVER_TIME = "--:--";
const MINUTE = 60_000;

const readTime = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function subscribe(onChange: () => void) {
  let interval: number | undefined;
  // Fire on the next minute boundary, then once a minute — no per-second wakeups.
  const timeout = window.setTimeout(() => {
    onChange();
    interval = window.setInterval(onChange, MINUTE);
  }, MINUTE - (Date.now() % MINUTE));
  // Background tabs throttle timers; catch up as soon as the tab is visible.
  const onVisible = () => {
    if (document.visibilityState === "visible") onChange();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    window.clearTimeout(timeout);
    if (interval !== undefined) window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function useClock() {
  return useSyncExternalStore(subscribe, readTime, () => SERVER_TIME);
}
