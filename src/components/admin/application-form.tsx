"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createApplication,
  updateApplication,
  type AppActionState,
} from "@/app/_actions/applications";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
} from "@/lib/applications";
import { cn } from "@/lib/utils";

export type ApplicationInput = {
  id?: string;
  company?: string;
  country?: string | null;
  city?: string | null;
  role?: string | null;
  fit?: string | null;
  source?: string;
  status?: string;
  careersUrl?: string | null;
  jobUrl?: string | null;
  sponsorsVisa?: boolean;
  targetSalary?: string | null;
  appliedAt?: string | null;
  followUp?: string | null;
  notes?: string | null;
};

const initial: AppActionState = { status: "idle" };

export function ApplicationForm({ application }: { application?: ApplicationInput }) {
  const isEdit = Boolean(application?.id);
  const action = isEdit
    ? updateApplication.bind(null, application!.id!)
    : createApplication;
  const [state, run, pending] = useActionState<AppActionState, FormData>(action, initial);
  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={run} className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Section title="Role & company">
        <Field name="company" label="Company" required defaultValue={application?.company} error={errors.company} />
        <Field name="role" label="Role / posting" defaultValue={application?.role ?? ""} error={errors.role} />
        <Field name="country" label="Country" defaultValue={application?.country ?? ""} help="e.g. IE, DE, NL" />
        <Field name="city" label="City" defaultValue={application?.city ?? ""} />
        <Field name="fit" label="Fit" defaultValue={application?.fit ?? ""} help="e.g. ⭐, ⭐ Go, Bom" />
        <Select
          name="source"
          label="Source"
          required
          defaultValue={application?.source ?? "company_site"}
          options={APPLICATION_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
          error={errors.source}
        />
      </Section>

      <Section title="Pipeline">
        <Select
          name="status"
          label="Status"
          required
          defaultValue={application?.status ?? "not_applied"}
          options={APPLICATION_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          error={errors.status}
        />
        <Field name="appliedAt" label="Applied date" type="date" defaultValue={application?.appliedAt ?? ""} />
        <Field name="followUp" label="Follow-up" defaultValue={application?.followUp ?? ""} help="a date or a short note" />
        <Field name="targetSalary" label="Target salary" defaultValue={application?.targetSalary ?? ""} />
        <Checkbox name="sponsorsVisa" label="Sponsors visa" defaultChecked={application?.sponsorsVisa ?? false} />
      </Section>

      <Section title="Links & notes" className="md:col-span-2">
        <Field name="careersUrl" label="Careers page URL" type="url" defaultValue={application?.careersUrl ?? ""} error={errors.careersUrl} />
        <Field name="jobUrl" label="Job posting URL" type="url" defaultValue={application?.jobUrl ?? ""} error={errors.jobUrl} />
        <Textarea name="notes" label="Notes" rows={4} defaultValue={application?.notes ?? ""} />
      </Section>

      {state.status === "error" && state.message ? (
        <p className="md:col-span-2 border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 font-mono text-[11px] tracking-[0.04em] text-[var(--red)]">
          {state.message === "db_unavailable"
            ? "Database is not configured."
            : "Something went wrong saving the application. Try again."}
        </p>
      ) : null}

      <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] pt-6">
        <Link
          href="/admin/applications"
          className="border border-[var(--border-2)] px-5 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition disabled:cursor-not-allowed disabled:opacity-60",
            !pending && "hover:opacity-90"
          )}
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add application"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 font-sans text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none";

function Section({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <fieldset className={cn("flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-5", className)}>
      <legend className="px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">{title}</legend>
      {children}
    </fieldset>
  );
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
      {children}
      {required ? <span className="text-[var(--accent)]">*</span> : null}
    </label>
  );
}
function Help({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] tracking-[0.02em] text-[var(--muted)]">{children}</p>;
}
function ErrorLine({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--red)]">{msg}</p>;
}

function Field({
  name,
  label,
  required,
  type = "text",
  defaultValue,
  help,
  error,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  defaultValue?: string | null;
  help?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} required={required}>{label}</Label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} className={inputClass} />
      {help ? <Help>{help}</Help> : null}
      <ErrorLine msg={error} />
    </div>
  );
}

function Select({
  name,
  label,
  required,
  defaultValue,
  options,
  error,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} required={required}>{label}</Label>
      <select id={name} name={name} defaultValue={defaultValue} required={required} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ErrorLine msg={error} />
    </div>
  );
}

function Textarea({
  name,
  label,
  rows = 3,
  defaultValue,
  help,
}: {
  name: string;
  label: string;
  rows?: number;
  defaultValue?: string | null;
  help?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <textarea id={name} name={name} rows={rows} defaultValue={defaultValue ?? ""} className={cn(inputClass, "resize-y font-mono text-[13px]")} />
      {help ? <Help>{help}</Help> : null}
    </div>
  );
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-[12px] tracking-[0.02em] text-[var(--text-2)]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--accent)]" />
      {label}
    </label>
  );
}
