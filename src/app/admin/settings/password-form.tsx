"use client";

/**
 * Password rotation form. `useTransition` + `toast` (AGENTS.md §5): the action
 * returns an `ActionResult`, so the result is in hand inside the same function
 * — no `useActionState` + `useEffect` pair (which is what trips
 * `react-hooks/set-state-in-effect`).
 */

import { useRef, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { changePassword } from "@/app/_actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Keep in sync with `MIN_PASSWORD_LENGTH` in `src/app/_actions/account.ts`. */
const MIN_LENGTH = 12;

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await changePassword(formData);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message);
        return;
      }
      setErrors({});
      // React only auto-resets a form whose `action` is a Server Action passed
      // straight through; this one goes through a client function, so reset it.
      formRef.current?.reset();
      toast.success(res.message ?? "Senha alterada.");
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:max-w-sm">
        <Field
          id="currentPassword"
          label="Senha atual"
          autoComplete="current-password"
          error={errors.currentPassword}
        />
        <Field
          id="newPassword"
          label="Nova senha"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          error={errors.newPassword}
          hint={`Mínimo de ${MIN_LENGTH} caracteres.`}
        />
        <Field
          id="confirmPassword"
          label="Confirme a nova senha"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          error={errors.confirmPassword}
        />
      </div>

      <Button type="submit" disabled={isPending}>
        <KeyRound className="size-4" />
        {isPending ? "Alterando…" : "Alterar senha"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  autoComplete,
  minLength,
  error,
  hint,
}: {
  id: string;
  label: string;
  autoComplete: string;
  minLength?: number;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        minLength={minLength}
        aria-invalid={Boolean(error)}
        required
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
