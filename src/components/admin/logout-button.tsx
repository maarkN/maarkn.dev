"use client";

import { logoutAction } from "@/app/_actions/auth";
import t from "@/components/terminal/terminal.module.css";
import c from "./terminal/admin-chrome.module.css";

/**
 * `exit` — the only control the admin status bar carries, where the public
 * site shows palette/font/language. Those three cannot exist here: they run
 * through the theme provider, which would write the visitor’s preference to the
 * `localStorage` shared with the public site.
 *
 * A form, not a button with an `onClick`: `logoutAction` is a Server Action,
 * so signing out still works without JavaScript.
 */
export function LogoutButton() {
  return (
    <form action={logoutAction} className={c.exit}>
      <button type="submit" className={t.barBtn} title="Encerrar a sessão">
        exit
      </button>
    </form>
  );
}
