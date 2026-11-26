"use client";

/**
 * Changing the password. The current one is checked on the server
 * (`changePassword`). On success the form is emptied on purpose: a password does
 * not stay on screen. That reset is the only one: `submitKeepingValues` (A15)
 * keeps what was typed when the change is refused.
 */

import { useRef, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import type { ActionResult } from "@/app/_actions/action-result";
import { changePassword } from "@/app/_actions/account";
import { useCommonLabels } from "@/components/admin/admin-locale";
import { FieldError, FieldHelp, RequiredHint, describedBy } from "@/components/admin/field-output";
import { submitKeepingValues, useFocusFirstInvalid } from "@/components/admin/form-submit";
import { useNotify } from "@/components/admin/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminDictionary } from "@/i18n/config";

/** Keep in sync with `MIN_PASSWORD_LENGTH` in `src/app/_actions/account.ts`. */
const MIN_LENGTH = 12;

export function PasswordForm({ words }: { words: AdminDictionary["settings"]["password"] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const notify = useNotify();
  const common = useCommonLabels();
  useFocusFirstInvalid(formRef, errors);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await changePassword(formData).catch((): ActionResult => ({ ok: false, message: common.failed }));
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        if (res.fieldErrors) notify.error(res.message);
        else notify.error(res.message, { action: { label: common.retry, onClick: () => formRef.current?.requestSubmit() } });
        return;
      }
      setErrors({});
      formRef.current?.reset();
      notify.success(res.message ?? words.done);
    });
  }

  return (
    <form ref={formRef} noValidate onSubmit={(event) => submitKeepingValues(event, onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:max-w-sm">
        <Field id="currentPassword" label={words.current} autoComplete="current-password" error={errors.currentPassword} />
        <Field
          id="newPassword"
          label={words.new}
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          error={errors.newPassword}
          hint={words.newHelp}
        />
        <Field
          id="confirmPassword"
          label={words.confirm}
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          error={errors.confirmPassword}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        <KeyRound aria-hidden="true" />
        {isPending ? words.pending : words.submit}
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
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        <RequiredHint />
      </Label>
      <Input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        minLength={minLength}
        className="w-full"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(hint && `${id}-help`, error && `${id}-error`)}
        required
      />
      {hint && <FieldHelp id={`${id}-help`}>{hint}</FieldHelp>}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
