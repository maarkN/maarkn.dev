"use client";

import { useRef, useState, useTransition } from "react";
import { Save } from "lucide-react";
import type { ActionResult } from "@/app/_actions/action-result";
import { setAdminTimeZone } from "@/app/_actions/preferences";
import { useCommonLabels } from "@/components/admin/admin-locale";
import { FieldError, FieldHelp, describedBy } from "@/components/admin/field-output";
import { submitKeepingValues, useFocusFirstInvalid } from "@/components/admin/form-submit";
import { useNotify } from "@/components/admin/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminDictionary } from "@/i18n/config";

/**
 * The time zone of the backoffice. Any name of the runtime; the list only
 * suggests. A zone it does not know is the field's error; a failure of the
 * server is a notice with "Tentar de novo", and the field stays as it was (A9).
 */
export function TimeZoneForm({
  current,
  zones,
  labels,
}: {
  current: string;
  zones: string[];
  labels: AdminDictionary["timeZone"];
}) {
  const [error, setError] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const notify = useNotify();
  const common = useCommonLabels();
  const form = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(form, error);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await setAdminTimeZone(formData).catch((): ActionResult => ({ ok: false, message: labels.failed }));
      if (result.ok) {
        setError({});
        notify.success(result.message ?? labels.saved);
        return;
      }
      setError(result.fieldErrors ?? {});
      if (result.fieldErrors) notify.error(result.message);
      else notify.error(result.message, { action: { label: common.retry, onClick: () => form.current?.requestSubmit() } });
    });
  }

  return (
    <form ref={form} noValidate onSubmit={(event) => submitKeepingValues(event, onSubmit)} className="space-y-4">
      <div className="space-y-2 sm:max-w-sm">
        <Label htmlFor="timeZone">{labels.label}</Label>
        <Input
          id="timeZone"
          name="timeZone"
          list="time-zones"
          defaultValue={current}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          className="w-full"
          aria-invalid={Boolean(error.timeZone)}
          aria-describedby={describedBy("timeZone-help", error.timeZone && "timeZone-error")}
        />
        <datalist id="time-zones">
          {zones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
        <FieldHelp id="timeZone-help">{labels.help}</FieldHelp>
        <FieldError id="timeZone-error">{error.timeZone}</FieldError>
      </div>
      <Button type="submit" disabled={isPending}>
        <Save aria-hidden="true" />
        {isPending ? labels.saving : labels.save}
      </Button>
    </form>
  );
}
