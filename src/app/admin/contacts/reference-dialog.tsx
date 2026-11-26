"use client";

/**
 * Create and edit a professional reference in a window. The same recipe as the
 * contact's (`./contact-dialog`): what was typed stays on a refusal, the focus
 * goes to the first field with a problem, a failure of the server offers to
 * try again.
 *
 * `canContact` is a gate and not a preference: unticked, the reference cannot
 * be handed to a recruiter.
 */

import { useRef, useState, useTransition } from "react";
import { Pencil, Plus, Save } from "lucide-react";
import type { ActionResult } from "@/app/_actions/action-result";
import { saveProfessionalReference } from "@/app/_actions/contacts";
import { useCommonLabels } from "@/components/admin/admin-locale";
import { FieldError, FieldHelp, RequiredHint, describedBy } from "@/components/admin/field-output";
import { submitKeepingValues, useFocusFirstInvalid } from "@/components/admin/form-submit";
import { useNotify } from "@/components/admin/notify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fill } from "@/lib/admin/text";
import { useContactsWords } from "./company-options";
import { REFERENCE_LANGUAGES } from "./vocabulary";

/** Mirror of the sentinel of `@/app/_actions/contacts`. */
const NONE = "none";

export type ReferenceInitial = {
  id: string;
  slug: string;
  name: string;
  relationship: string | null;
  companyName: string | null;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  language: string | null;
  canContact: boolean;
  noteMd: string | null;
};

export function ReferenceDialog({ initial }: { initial?: ReferenceInitial }) {
  const { reference: words, vocab } = useContactsWords();
  const common = useCommonLabels();
  const notify = useNotify();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(form, errors);
  const f = words.fields;

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveProfessionalReference(initial?.id ?? null, formData).catch(
        (): ActionResult<{ id: string }> => ({ ok: false, message: common.failed }),
      );
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (result.fieldErrors) notify.error(result.message);
        else notify.error(result.message, { action: { label: common.retry, onClick: () => form.current?.requestSubmit() } });
        return;
      }
      setErrors({});
      setOpen(false); // closes on success only
      notify.success(result.message ?? words.saved);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setErrors({});
      }}
    >
      <DialogTrigger asChild>
        {initial ? (
          <Button
            variant="ghost"
            size="icon-sm"
            data-row-open=""
            aria-label={fill(words.edit, { name: initial.name })}
            title={fill(words.edit, { name: initial.name })}
          >
            <Pencil aria-hidden="true" />
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden="true" />
            {words.create}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <form ref={form} noValidate onSubmit={(event) => submitKeepingValues(event, onSubmit)} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{initial ? words.editTitle : words.newTitle}</DialogTitle>
            <DialogDescription>{words.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="reference-name" name="name" label={f.name} defaultValue={initial?.name ?? ""} error={errors.name} required />
            <Field
              id="reference-slug"
              name="slug"
              label={f.slug}
              defaultValue={initial?.slug ?? ""}
              error={errors.slug}
              placeholder={f.slugPlaceholder}
              help={f.slugHelp}
            />
            <Field
              id="reference-relationship"
              name="relationship"
              label={f.relationship}
              defaultValue={initial?.relationship ?? ""}
              error={errors.relationship}
              placeholder={f.relationshipPlaceholder}
            />
            <Field
              id="reference-company"
              name="companyName"
              label={f.companyName}
              defaultValue={initial?.companyName ?? ""}
              error={errors.companyName}
            />
            <Field id="reference-role" name="roleTitle" label={f.roleTitle} defaultValue={initial?.roleTitle ?? ""} error={errors.roleTitle} />

            <div className="space-y-2">
              <Label htmlFor="reference-language">{f.language}</Label>
              <Select name="language" defaultValue={initial?.language ?? NONE}>
                <SelectTrigger
                  id="reference-language"
                  className="w-full"
                  aria-invalid={Boolean(errors.language)}
                  aria-describedby={describedBy(errors.language && "reference-language-error")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{f.noLanguage}</SelectItem>
                  {REFERENCE_LANGUAGES.map((language) => (
                    <SelectItem key={language} value={language}>
                      {vocab.referenceLanguage[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="reference-language-error">{errors.language}</FieldError>
            </div>

            <Field id="reference-email" name="email" type="email" label={f.email} defaultValue={initial?.email ?? ""} error={errors.email} />
            <Field id="reference-phone" name="phone" type="tel" label={f.phone} defaultValue={initial?.phone ?? ""} error={errors.phone} />
            <Field
              id="reference-linkedin"
              name="linkedinUrl"
              type="url"
              label={f.linkedinUrl}
              defaultValue={initial?.linkedinUrl ?? ""}
              error={errors.linkedinUrl}
              placeholder="https://www.linkedin.com/in/…"
              className="sm:col-span-2"
            />

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="reference-can-contact"
                  name="canContact"
                  defaultChecked={initial?.canContact ?? false}
                  aria-describedby="reference-can-contact-help"
                />
                <Label htmlFor="reference-can-contact">{f.canContact}</Label>
              </div>
              <FieldHelp id="reference-can-contact-help">{f.canContactHelp}</FieldHelp>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="reference-note">{f.noteMd}</Label>
              <Textarea
                id="reference-note"
                name="noteMd"
                rows={4}
                defaultValue={initial?.noteMd ?? ""}
                placeholder={f.notePlaceholder}
                aria-invalid={Boolean(errors.noteMd)}
                aria-describedby={describedBy(errors.noteMd && "reference-note-error")}
              />
              <FieldError id="reference-note-error">{errors.noteMd}</FieldError>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              {common.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save aria-hidden="true" />
              {isPending ? common.saving : words.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  defaultValue,
  error,
  placeholder,
  help,
  required,
  className,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  defaultValue: string;
  error?: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {label}
        {required && <RequiredHint />}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(help && `${id}-help`, error && `${id}-error`)}
      />
      {help && <FieldHelp id={`${id}-help`}>{help}</FieldHelp>}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
