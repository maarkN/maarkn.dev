"use client";

/**
 * Create and edit a contact in a window, without leaving the list (AGENTS.md
 * §5). The same component for both: without `initial` it creates.
 *
 * A refusal keeps the window open with what was typed (`submitKeepingValues`,
 * A15), each error next to its field and the focus on the first of them; a
 * failure of the server says so in a notice that offers to try again.
 */

import { useRef, useState, useTransition } from "react";
import { Pencil, Plus, Save } from "lucide-react";
import type { ActionResult } from "@/app/_actions/action-result";
import { saveContact } from "@/app/_actions/contacts";
import { useCommonLabels } from "@/components/admin/admin-locale";
import { FieldError, FieldHelp, RequiredHint, describedBy } from "@/components/admin/field-output";
import { submitKeepingValues, useFocusFirstInvalid } from "@/components/admin/form-submit";
import { useNotify } from "@/components/admin/notify";
import { Button } from "@/components/ui/button";
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
import { useCompanyOptions, useContactsWords } from "./company-options";
import { CONTACT_CHANNELS } from "./vocabulary";

/** Mirror of the sentinel of `@/app/_actions/contacts`: Radix forbids `value=""`. */
const NONE = "none";

export type ContactInitial = {
  id: string;
  name: string;
  roleTitle: string | null;
  companyId: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  timezone: string | null;
  channel: string | null;
  notesMd: string | null;
};

export function ContactDialog({ initial }: { initial?: ContactInitial }) {
  const companies = useCompanyOptions();
  const { contact: words, vocab } = useContactsWords();
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
      const result = await saveContact(initial?.id ?? null, formData).catch(
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
        {/* A15: `onSubmit`, never `action=`: React 19 resets the form at the end
            of ANY `action` function, which emptied it on an error. */}
        {/* `noValidate`: the errors are the screen's, next to each field, and
            not the browser's bubble. */}
        <form ref={form} noValidate onSubmit={(event) => submitKeepingValues(event, onSubmit)} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{initial ? words.editTitle : words.newTitle}</DialogTitle>
            <DialogDescription>{words.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="contact-name" name="name" label={f.name} defaultValue={initial?.name ?? ""} error={errors.name} required />
            <Field
              id="contact-role"
              name="roleTitle"
              label={f.roleTitle}
              defaultValue={initial?.roleTitle ?? ""}
              error={errors.roleTitle}
              placeholder={f.rolePlaceholder}
            />

            <div className="space-y-2">
              <Label htmlFor="contact-company">{f.company}</Label>
              {/* Never `disabled` when the list comes empty (a failed read): a
                  disabled Select sends no field, and saving would read it as
                  "remove the company", unlinking it in silence. */}
              <Select name="companyId" defaultValue={initial?.companyId ?? NONE}>
                <SelectTrigger
                  id="contact-company"
                  className="w-full"
                  aria-invalid={Boolean(errors.companyId)}
                  aria-describedby={describedBy("contact-company-help", errors.companyId && "contact-company-error")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{f.noCompany}</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldHelp id="contact-company-help">{f.companyHelp}</FieldHelp>
              <FieldError id="contact-company-error">{errors.companyId}</FieldError>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-channel">{f.channel}</Label>
              <Select name="channel" defaultValue={initial?.channel ?? NONE}>
                <SelectTrigger
                  id="contact-channel"
                  className="w-full"
                  aria-invalid={Boolean(errors.channel)}
                  aria-describedby={describedBy(errors.channel && "contact-channel-error")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{f.noChannel}</SelectItem>
                  {CONTACT_CHANNELS.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {vocab.channel[channel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="contact-channel-error">{errors.channel}</FieldError>
            </div>

            <Field
              id="contact-email"
              name="email"
              type="email"
              label={f.email}
              defaultValue={initial?.email ?? ""}
              error={errors.email}
              placeholder={f.emailPlaceholder}
            />
            <Field id="contact-phone" name="phone" type="tel" label={f.phone} defaultValue={initial?.phone ?? ""} error={errors.phone} />
            <Field
              id="contact-linkedin"
              name="linkedinUrl"
              type="url"
              label={f.linkedinUrl}
              defaultValue={initial?.linkedinUrl ?? ""}
              error={errors.linkedinUrl}
              placeholder="https://www.linkedin.com/in/…"
              className="sm:col-span-2"
            />
            <Field
              id="contact-timezone"
              name="timezone"
              label={f.timezone}
              defaultValue={initial?.timezone ?? ""}
              error={errors.timezone}
              placeholder="America/Toronto"
            />

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contact-notes">{f.notesMd}</Label>
              <Textarea
                id="contact-notes"
                name="notesMd"
                rows={4}
                defaultValue={initial?.notesMd ?? ""}
                placeholder={f.notesPlaceholder}
                aria-invalid={Boolean(errors.notesMd)}
                aria-describedby={describedBy(errors.notesMd && "contact-notes-error")}
              />
              <FieldError id="contact-notes-error">{errors.notesMd}</FieldError>
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
        // Someone else's personal data: out of the browser's autofill.
        autoComplete="off"
        className="w-full"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(error && `${id}-error`)}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
