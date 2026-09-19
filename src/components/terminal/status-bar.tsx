"use client";

import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useTheme } from "@/components/theme-provider";
import { isTerminalLocale, otherLocale, shortLocale, switchLocale } from "@/lib/terminal/locale";
import { PROMPT_USER } from "./prompt";
import { useClock } from "./use-clock";
import s from "./terminal.module.css";
import type { TerminalLabels } from "./types";

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
