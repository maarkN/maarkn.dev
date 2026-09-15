"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { clsx } from "clsx";
import { useTheme } from "@/components/theme-provider";
import { isTerminalLocale, otherLocale, shortLocale, switchLocale } from "@/lib/terminal/locale";
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
  locale,
  path,
  onLang,
  onActivate,
}: {
  labels: TerminalLabels["bar"];
  /** Current locale, shown by the `lang` control. */
  locale: string;
  /**
   * Inner pages show their location (`~/projects/<slug>`) instead of the
   * profile title; it stays visible on narrow screens.
   */
  path?: string;
  /**
   * The terminal runs its `lang` command (echoed on screen) instead of the
   * bar switching on its own, which is what the inner pages do.
   */
  onLang?: () => void;
  /** Called after a control is used, so the shell can refocus the prompt. */
  onActivate?: () => void;
}) {
  const { theme, font, toggleTheme, toggleFont } = useTheme();
  const time = useClock();
  const router = useRouter();

  const switchLang = () => {
    if (onLang) return onLang();
    switchLocale(otherLocale(isTerminalLocale(locale) ? locale : "en"), (href) => router.push(href));
  };

  return (
    <header className={s.bar}>
      <span className={s.barUser}>{PROMPT_USER}</span>
      <span className={clsx(s.barTitle, path && s.barPath)}>{path ?? labels.title}</span>
      <button
        type="button"
        className={s.barBtn}
        title={labels.themeTitle}
        onClick={() => {
          toggleTheme();
          onActivate?.();
        }}
      >
        <span className={s.barBtnLabel}>{labels.theme}</span> <b>{theme}</b>
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
        <span className={s.barBtnLabel}>{labels.font}</span> <b>{font}</b>
      </button>
      <button
        type="button"
        className={s.barBtn}
        title={labels.langTitle}
        onClick={() => {
          switchLang();
          onActivate?.();
        }}
      >
        <span className={s.barBtnLabel}>{labels.lang}</span> <b>{shortLocale(locale)}</b>
      </button>
      <span className={clsx(s.barClock, path && s.barClockPath)}>{time}</span>
    </header>
  );
}
