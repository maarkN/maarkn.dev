"use client";

import { clsx } from "clsx";
import { PROMPT_USER } from "@/components/terminal/prompt";
import { useClock } from "@/components/terminal/use-clock";
import t from "@/components/terminal/terminal.module.css";
import { LogoutButton } from "../logout-button";

/**
 * The backoffice's tmux-style status bar: `maarkn@dev`, the location of the
 * screen, `exit` and the clock.
 *
 * Deliberately NOT `@/components/terminal/status-bar`: that one depends on
 * `useTheme` and renders the palette/font/language toggles, which the admin
 * must not offer — the provider would persist the choice in the `localStorage`
 * the public site reads. It does reuse that component's STYLE SHEET
 * (`terminal.module.css`), so the two bars cannot drift in height, spacing or
 * colour; a change to the `.bar*` classes is felt on both sides.
 */
export function AdminStatusBar({ path }: { path: string }) {
  const time = useClock();

  return (
    <header className={t.bar}>
      <span className={t.barUser}>{PROMPT_USER}</span>
      {/* `barPath` keeps the location visible on narrow screens, where the
          site's bar hides its title. */}
      <span className={clsx(t.barTitle, t.barPath)} lang="en">
        {path}
      </span>
      <LogoutButton />
      <span className={t.barClock}>{time}</span>
    </header>
  );
}
