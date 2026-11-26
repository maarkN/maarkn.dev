"use client";

/**
 * The full-page form of an application (create and edit), on the normalised
 * model `Application` + `Job` + `Company`.
 *
 * `useActionState`, and not `useTransition`, on purpose: the actions
 * `createApplication`/`updateApplication` `redirect()` on success, so there is
 * nothing to hand back to the browser; the list receiving the redirect says it
 * in a notice. A refusal comes back here: each field says what is wrong, the
 * focus goes to the first of them, and what was typed stays.
 *
 * Two things this form does that the old one did not:
 *
 * 1. **It shows the natural key.** `folderName` is what keeps the agent from
 *    duplicating the application on the next sync of the vault. It is shown,
 *    editable, and filled by the same rule as the migration (`company--job`).
 * 2. **The visa is a signal, not a checkbox.** Eight real signals and one more,
 *    "the job's", which is the default: repeating on the application what is on
 *    the job is how the two drift apart.
 */

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { RotateCw, Save } from "lucide-react";
import { createApplication, updateApplication, type AppActionState } from "@/app/_actions/applications";
import { useCommonLabels } from "@/components/admin/admin-locale";
import { FieldError, FieldHelp, RequiredHint, describedBy } from "@/components/admin/field-output";
import { useFocusFirstInvalid } from "@/components/admin/form-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminDictionary } from "@/i18n/config";
import {
  APPLICATION_SOURCES,
  FUNNEL_STAGE_PHASES,
  SPONSORSHIP_SIGNALS,
  buildFolderName,
} from "@/lib/applications";

/** Mirror of the sentinel of `src/app/_actions/applications.ts`. */
export const INHERIT_SPONSORSHIP = "inherit";

export type ApplicationInput = {
  id?: string;
  folderName?: string;
  company?: string;
  roleTitle?: string | null;
  market?: string | null;
  locationText?: string | null;
  stage?: string;
  sponsorship?: string | null;
  source?: string | null;
  fit?: string | null;
  priority?: number | null;
  careersUrl?: string | null;
  jobUrl?: string | null;
  targetSalary?: string | null;
  /** Already `YYYY-MM-DD` (`toDateInputValue` on the page). */
  appliedAt?: string | null;
  followUp?: string | null;
  notesMd?: string | null;
};

export type ApplicationFormWords = {
  form: AdminDictionary["applicationForm"];
  vocab: Pick<AdminDictionary["vocab"], "stage" | "phase" | "visa" | "visaHint" | "source">;
};

type FieldKey = keyof AdminDictionary["applicationForm"]["errors"];

const initialState: AppActionState = { status: "idle" };

/**
 * zod's message is raw, and in English: the sentence on screen is the
 * dictionary's, by field. A collision of a natural key comes back as the code
 * `duplicate`.
 */
function errorText(field: string, errors: Record<string, string>, words: ApplicationFormWords["form"]["errors"]) {
  const raw = errors[field];
  if (!raw) return undefined;
  if (raw === "duplicate") {
    return field === "folderName" ? words.duplicateFolder : field === "jobUrl" ? words.duplicateJob : words.duplicate;
  }
  return words[field as FieldKey] ?? words.invalid;
}

export function ApplicationForm({ application, words }: { application?: ApplicationInput; words: ApplicationFormWords }) {
  const { form: text, vocab } = words;
  const common = useCommonLabels();
  const isEdit = Boolean(application?.id);
  const action = isEdit ? updateApplication.bind(null, application!.id!) : createApplication;
  const [state, run, pending] = useActionState<AppActionState, FormData>(action, initialState);
  const errors = state.status === "error" ? state.errors : undefined;
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, errors);
  const err = (field: string) => errorText(field, errors ?? {}, text.errors);

  // The natural key is derived until it is edited. Once touched (or from the
  // database) it stays: rewriting it would break the tie with the vault's folder.
  const [company, setCompany] = useState(application?.company ?? "");
  const [roleTitle, setRoleTitle] = useState(application?.roleTitle ?? "");
  const [market, setMarket] = useState(application?.market ?? "");
  const [folderName, setFolderName] = useState(application?.folderName ?? "");
  const [folderTouched, setFolderTouched] = useState(Boolean(application?.folderName));
  const derivedFolder = company ? buildFolderName({ company, roleTitle, market }) : "";
  const folderValue = folderTouched ? folderName : derivedFolder;

  /**
   * The OTHER fields are state too, and that is what keeps what was typed.
   *
   * React 19 resets the form when the `action` function ends, and
   * `useActionState` is no exception (measured by `scripts/smoke-admin-write.mjs`:
   * only the controlled fields survived a refusal). The way out here is state,
   * and not `onSubmit` + `preventDefault` as in the dialogs: this form passes a
   * Server Action to `action=` and works without JavaScript. A controlled field
   * is rendered with its `value` in the server's HTML, so sending without
   * JavaScript still sends everything.
   */
  const [values, setValues] = useState<Record<string, string>>({
    locationText: application?.locationText ?? "",
    fit: application?.fit ?? "",
    priority: application?.priority != null ? String(application.priority) : "",
    appliedAt: application?.appliedAt ?? "",
    followUp: application?.followUp ?? "",
    targetSalary: application?.targetSalary ?? "",
    jobUrl: application?.jobUrl ?? "",
    careersUrl: application?.careersUrl ?? "",
    notesMd: application?.notesMd ?? "",
  });
  const bind = (name: string) => ({
    value: values[name] ?? "",
    onChange: (value: string) => setValues((prev) => ({ ...prev, [name]: value })),
    error: err(name),
  });

  const failure =
    state.status === "error"
      ? state.message === "db_unavailable"
        ? text.noDatabase
        : state.message === "unexpected"
          ? text.failed
          : null
      : null;

  return (
    <form ref={formRef} action={run} className="space-y-8 font-text">
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        <Group legend={text.sections.job} help={text.sections.jobHelp}>
          <Field
            name="company"
            label={text.fields.company}
            required
            value={company}
            onChange={setCompany}
            help={text.fields.companyHelp}
            error={err("company")}
          />
          <Field name="roleTitle" label={text.fields.roleTitle} value={roleTitle} onChange={setRoleTitle} error={err("roleTitle")} />
          <Field
            name="market"
            label={text.fields.market}
            value={market}
            onChange={setMarket}
            help={text.fields.marketHelp}
            error={err("market")}
          />
          <Field name="locationText" label={text.fields.locationText} help={text.fields.locationHelp} {...bind("locationText")} />
          <Field
            name="folderName"
            label={text.fields.folderName}
            value={folderValue}
            onChange={(value) => {
              setFolderTouched(true);
              setFolderName(value);
            }}
            label-font
            help={text.fields.folderHelp}
            error={err("folderName")}
          />
        </Group>

        <Group legend={text.sections.funnel} help={text.sections.funnelHelp}>
          <div className="space-y-2">
            <Label htmlFor="stage">{text.fields.stage}</Label>
            <Select name="stage" defaultValue={application?.stage ?? "radar"}>
              <SelectTrigger
                id="stage"
                className="w-full"
                aria-invalid={Boolean(err("stage"))}
                aria-describedby={describedBy(err("stage") && "stage-error")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNNEL_STAGE_PHASES.map((phase) => (
                  <SelectGroup key={phase.key}>
                    <SelectLabel>{vocab.phase[phase.key]}</SelectLabel>
                    {phase.stages.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {vocab.stage[stage]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="stage-error">{err("stage")}</FieldError>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsorship">{text.fields.sponsorship}</Label>
            <Select name="sponsorship" defaultValue={application?.sponsorship ?? INHERIT_SPONSORSHIP}>
              <SelectTrigger
                id="sponsorship"
                className="w-full"
                aria-invalid={Boolean(err("sponsorship"))}
                aria-describedby={describedBy("sponsorship-help", err("sponsorship") && "sponsorship-error")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={INHERIT_SPONSORSHIP}>{text.fields.inherit}</SelectItem>
                {SPONSORSHIP_SIGNALS.map((signal) => (
                  <SelectItem key={signal} value={signal} title={vocab.visaHint[signal]}>
                    {vocab.visa[signal]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldHelp id="sponsorship-help">{text.fields.sponsorshipHelp}</FieldHelp>
            <FieldError id="sponsorship-error">{err("sponsorship")}</FieldError>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">{text.fields.source}</Label>
            <Select name="source" defaultValue={application?.source ?? "company_site"}>
              <SelectTrigger
                id="source"
                className="w-full"
                aria-invalid={Boolean(err("source"))}
                aria-describedby={describedBy(err("source") && "source-error")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_SOURCES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {vocab.source[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="source-error">{err("source")}</FieldError>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field name="fit" label={text.fields.fit} help={text.fields.fitHelp} {...bind("fit")} />
            <Field name="priority" label={text.fields.priority} type="number" help={text.fields.priorityHelp} {...bind("priority")} />
          </div>
        </Group>

        <Group legend={text.sections.dates} help={text.sections.datesHelp}>
          <Field name="appliedAt" label={text.fields.appliedAt} type="date" {...bind("appliedAt")} />
          <Field name="followUp" label={text.fields.followUp} help={text.fields.followUpHelp} {...bind("followUp")} />
          <Field name="targetSalary" label={text.fields.targetSalary} {...bind("targetSalary")} />
        </Group>

        <Group legend={text.sections.links} help={text.sections.linksHelp}>
          <Field name="jobUrl" label={text.fields.jobUrl} type="url" {...bind("jobUrl")} />
          <Field name="careersUrl" label={text.fields.careersUrl} type="url" help={text.fields.careersHelp} {...bind("careersUrl")} />
        </Group>

        <Group legend={text.sections.notes} help={text.sections.notesHelp} className="lg:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="notesMd">{text.fields.notesMd}</Label>
            <Textarea
              id="notesMd"
              name="notesMd"
              rows={6}
              value={values.notesMd}
              onChange={(event) => setValues((prev) => ({ ...prev, notesMd: event.target.value }))}
              aria-invalid={Boolean(err("notesMd"))}
              aria-describedby={describedBy(err("notesMd") && "notesMd-error")}
            />
            <FieldError id="notesMd-error">{err("notesMd")}</FieldError>
          </div>
        </Group>
      </div>

      {failure ? (
        <div className="flex flex-wrap items-center gap-4">
          <FieldError className="text-base">{failure}</FieldError>
          <Button type="submit" variant="outline" disabled={pending}>
            <RotateCw aria-hidden="true" />
            {common.retry}
          </Button>
        </div>
      ) : (
        errors && Object.keys(errors).length > 0 && <FieldError className="text-base">{common.checkFields}</FieldError>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
        <Button asChild variant="ghost">
          <Link href="/admin/applications">{text.cancel}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          <Save aria-hidden="true" />
          {isEdit ? text.save : text.create}
        </Button>
      </div>
    </form>
  );
}

/** A group of fields: a fieldset, whose legend names it for a screen reader too. */
function Group({
  legend,
  help,
  className,
  children,
}: {
  legend: string;
  help: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={`min-w-0 space-y-5 ${className ?? ""}`}>
      <legend className="font-title text-xl font-[560] [font-stretch:104%]">{legend}</legend>
      <p className="-mt-4 text-sm text-muted-foreground">{help}</p>
      {children}
    </fieldset>
  );
}

/* ── Fields: the shadcn primitives, nothing home-made (A6) ─────────────────── */

function Field({
  name,
  label,
  required,
  type = "text",
  value,
  onChange,
  help,
  error,
  "label-font": labelFont,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  /** Every text field is controlled: see the note on React 19's reset above. */
  value: string;
  onChange: (value: string) => void;
  help?: string;
  error?: string;
  /** A key, written in the face of labels. */
  "label-font"?: boolean;
}) {
  const helpId = help ? `${name}-help` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <RequiredHint />}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(helpId, errorId)}
        className={labelFont ? "w-full [&>input]:font-label [&>input]:text-sm" : "w-full"}
      />
      {help && <FieldHelp id={helpId}>{help}</FieldHelp>}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
