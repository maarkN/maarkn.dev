"use client";

/**
 * Sign-in form, drawn as a tty console (`login:` / `password:`).
 *
 * `useActionState` is still the right tool here (AGENTS.md §5): it is a
 * full-page form with no dialog and no toast, and the happy path never
 * returns — `loginAction` calls `signIn(..., { redirectTo })`, which throws
 * Next's redirect control-flow exception.
 *
 * SECURITY, unchanged by the repaint: the error copy below is deliberately
 * the SAME line for a wrong password and for an address that does not exist,
 * so the screen never confirms whether an account is there. The per-IP
 * throttle lives server-side in `src/lib/login-throttle.ts` and is untouched
 * by this component.
 */

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/_actions/auth";
import s from "./terminal/admin-chrome.module.css";

const initial: LoginState = { status: "idle" };

/** `loginAction` returns machine keys; the pt-BR copy lives here. */
const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  auth_error: "Não foi possível entrar. Tente de novo.",
};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  const failed = state.status === "error";

  return (
    <form action={action} className={s.ttyForm}>
      <p className={s.ttyField}>
        <label htmlFor="email" className={s.ttyLabel} lang="en">
          login:
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          className={s.ttyInput}
          aria-invalid={failed}
          required
        />
      </p>

      <p className={s.ttyField}>
        <label htmlFor="password" className={s.ttyLabel} lang="en">
          password:
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={s.ttyInput}
          aria-invalid={failed}
          required
        />
      </p>

      {/* An output line, not a field error: the console answers and reprints
          the prompt. `role="alert"` so it is announced on arrival. */}
      {failed && (
        <p className={s.ttyOut} role="alert">
          {ERROR_MESSAGES[state.message] ?? ERROR_MESSAGES.auth_error}
        </p>
      )}

      <button type="submit" className={s.ttySubmit} disabled={pending} lang="en">
        {pending ? "authenticating…" : "login"}
        {pending ? null : <span className={s.caret} aria-hidden="true">{" ▸"}</span>}
      </button>
    </form>
  );
}
