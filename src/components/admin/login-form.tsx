"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { loginAction, type LoginState } from "@/app/_actions/auth";
import { cn } from "@/lib/utils";

const initial: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" required />
      <Field
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
      />

      {state.status === "error" ? (
        <p className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 font-mono text-[11px] tracking-[0.04em] text-[var(--red)]">
          {state.message === "invalid_credentials"
            ? "Wrong email or password."
            : "Couldn't sign you in. Try again."}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "mt-2 inline-flex items-center justify-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-white transition disabled:cursor-not-allowed disabled:opacity-60",
          !pending && "hover:opacity-90"
        )}
      >
        {pending ? "Signing in…" : "Sign in"}
        {!pending ? <ArrowRight className="h-4 w-4" strokeWidth={2.2} /> : null}
      </button>
    </form>
  );
}

function Field(props: {
  id: string;
  name: string;
  type: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={props.id}
        className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
      >
        {props.label}
      </label>
      <input
        id={props.id}
        name={props.name}
        type={props.type}
        autoComplete={props.autoComplete}
        required={props.required}
        className="border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 font-sans text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
      />
    </div>
  );
}
