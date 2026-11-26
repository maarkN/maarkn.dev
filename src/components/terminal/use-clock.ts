"use client";

import { useSyncExternalStore } from "react";

/**
 * Wall clock for the CLI version's status bar and the site's notch: `--:--` on
 * the server, `HH:mm` on the client, in the visitor's zone unless another one is
 * asked for.
 */

const SERVER_TIME = "--:--";
const MINUTE = 60_000;

const readTime = (timeZone?: string) =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });

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

export function useClock(timeZone?: string) {
  return useSyncExternalStore(subscribe, () => readTime(timeZone), () => SERVER_TIME);
}
