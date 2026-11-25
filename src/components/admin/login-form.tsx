"use client";

/**
 * Sign-in form.
 *
 * `useActionState` is still the right tool here (AGENTS.md §5): it is a
 * full-page form with no dialog and no toast, and the happy path never
 * returns — `loginAction` calls `signIn(..., { redirectTo })`, which throws
 * Next's redirect control-flow exception.
 *
 * SECURITY: the error below is deliberately the SAME for a wrong password, for an
 * address that does not exist and for an address that was locked out, and it is
 * the form's and not a field's, so the screen never confirms whether an account
 * is there. The per-IP throttle lives server-side in `src/lib/login-throttle.ts`
 * and is untouched by this component.
 */

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/_actions/auth";
import { HoloButton } from "@/components/holo/button";
import { HoloField } from "@/components/holo/field";
import { HoloNotice } from "@/components/holo/notice";
import type { AdminDictionary } from "@/i18n/config";
import styles from "./login.module.css";

const initial: LoginState = { status: "idle" };

export function LoginForm({ labels }: { labels: AdminDictionary["login"] }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const failed = state.status === "error";

  return (
    <form action={action} className={styles.form}>
      <HoloField
        id="email"
        name="email"
        type="email"
        label={labels.email}
        autoComplete="email"
        autoCapitalize="off"
        spellCheck={false}
        aria-invalid={failed}
        required
      />
      <HoloField
        id="password"
        name="password"
        type="password"
        label={labels.password}
        autoComplete="current-password"
        aria-invalid={failed}
        required
      />

      {/* `loginAction` returns machine keys; the words are the dictionary's.
          Announced on arrival: the notice is an alert. */}
      {failed && (
        <HoloNotice
          tone="bad"
          title={state.message === "invalid_credentials" ? labels.invalid : labels.failed}
        />
      )}

      <div className={styles.actions}>
        <HoloButton type="submit" size="lg" variant="primary" seed={labels.submit} disabled={pending}>
          {pending ? labels.pending : labels.submit}
        </HoloButton>
      </div>
    </form>
  );
}
