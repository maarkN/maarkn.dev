"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setAdminTimeZone } from "@/app/_actions/preferences";
import { FieldError, FieldHelp, describedBy } from "@/components/admin/field-output";
import { submitKeepingValues } from "@/components/admin/form-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminDictionary } from "@/i18n/config";
import type { AdminLocale } from "@/lib/admin/locale";

/** The time zone of the backoffice. Any name of the runtime; the list only suggests. */
export function TimeZoneForm({
  current,
  zones,
  locale,
  labels,
}: {
  current: string;
  zones: string[];
  locale: AdminLocale;
  labels: AdminDictionary["timeZone"];
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await setAdminTimeZone(formData).catch(() => ({ ok: false as const, message: labels.failed }));
      setError(result.ok ? undefined : result.message);
      // The notices are marked as the language of the screens (layout.tsx).
      const message = <span lang={locale}>{result.message}</span>;
      if (result.ok) toast.success(message);
      else toast.error(message);
    });
  }

  return (
    <form onSubmit={(event) => submitKeepingValues(event, onSubmit)} className="space-y-4">
      <div className="space-y-1.5 sm:max-w-sm">
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
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy("timeZone-help", error && "timeZone-error")}
        />
        <datalist id="time-zones">
          {zones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
        <FieldHelp id="timeZone-help">{labels.help}</FieldHelp>
        <FieldError id="timeZone-error">{error}</FieldError>
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        [ {isPending ? labels.saving : labels.save} ]
      </Button>
    </form>
  );
}
