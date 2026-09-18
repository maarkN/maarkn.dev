"use client";

/**
 * Sign-in form. This is the one place `useActionState` is still the right tool
 * (AGENTS.md §5): it is a full-page form with no dialog and no toast, and the
 * happy path never returns — `loginAction` calls `signIn(..., { redirectTo })`,
 * which throws Next's redirect control-flow exception.
 */

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { loginAction, type LoginState } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: LoginState = { status: "idle" };

/** `loginAction` returns machine keys; the pt-BR copy lives here. */
const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  auth_error: "Não foi possível entrar. Tente de novo.",
};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={state.status === "error"}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={state.status === "error"}
          required
        />
      </div>

      {state.status === "error" ? (
        <p className="text-xs text-destructive">
          {ERROR_MESSAGES[state.message] ??
            "Não foi possível entrar. Tente de novo."}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
        {pending ? null : <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
