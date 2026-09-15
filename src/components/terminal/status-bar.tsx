"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/theme-provider";
import { PROMPT_USER } from "./prompt";
import s from "./terminal.module.css";
import type { TerminalLabels } from "./types";

/* ── clock: `--:--` on the server, HH:mm in the visitor's zone on the client ── */

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

function useClock() {
  return useSyncExternalStore(subscribe, readTime, () => SERVER_TIME);
}

/* ── bar ─────────────────────────────────────────────────────────── */

export function StatusBar({
  labels,
  onActivate,
}: {
  labels: TerminalLabels["bar"];
  /** Called after a control is used, so the shell can refocus the prompt. */
  onActivate?: () => void;
}) {
  const { theme, font, toggleTheme, toggleFont } = useTheme();
  const time = useClock();

  return (
    <header className={s.bar}>
      <span className={s.barUser}>{PROMPT_USER}</span>
      <span className={s.barTitle}>{labels.title}</span>
      <button
        type="button"
        className={s.barBtn}
        title={labels.themeTitle}
        onClick={() => {
          toggleTheme();
          onActivate?.();
        }}
      >
        {labels.theme} <b>{theme}</b>
      </button>
      <button
        type="button"
        className={s.barBtn}
        title={labels.fontTitle}
        onClick={() => {
          toggleFont();
          onActivate?.();
        }}
      >
        {labels.font} <b>{font}</b>
      </button>
      <span className={s.barClock}>{time}</span>
    </header>
  );
}
