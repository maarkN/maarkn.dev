"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createProject,
  updateProject,
  type ActionState,
} from "@/app/_actions/admin-projects";
import { cn } from "@/lib/utils";

type ProjectInput = {
  id?: string;
  slug?: string;
  name?: string;
  year?: string;
  category?: string;
  status?: string;
  featured?: boolean;
  monogram?: string;
  accentFrom?: string;
  accentTo?: string;
  stack?: string[];
  repoUrl?: string | null;
  demoUrl?: string | null;
  caseUrl?: string | null;
  tagline?: string | null;
  description?: string | null;
  role?: string | null;
  features?: string[];
};

const CATEGORIES = ["web", "mobile", "ai", "backend", "client"] as const;
const STATUSES = ["live", "internal", "nda", "archived"] as const;

const initial: ActionState = { status: "idle" };

export function ProjectForm({ project }: { project?: ProjectInput }) {
  const isEdit = Boolean(project?.id);
  const action = isEdit
    ? updateProject.bind(null, project!.id!)
    : createProject;

  const [state, run, pending] = useActionState<ActionState, FormData>(action, initial);
  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={run} className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Section title="Identity">
        <Field
          name="slug"
          label="Slug"
          required
          defaultValue={project?.slug}
          help="lowercase, hyphens, used in /projects/[slug]"
          error={errors.slug}
        />
        <Field
          name="name"
          label="Project name"
          required
          defaultValue={project?.name}
          error={errors.name}
        />
        <Field
          name="year"
          label="Year"
          required
          defaultValue={project?.year}
          error={errors.year}
        />
        <Select
          name="category"
          label="Category"
          required
          defaultValue={project?.category ?? "web"}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          error={errors.category}
        />
        <Select
          name="status"
          label="Status"
          required
          defaultValue={project?.status ?? "live"}
          options={STATUSES.map((s) => ({ value: s, label: s }))}
          error={errors.status}
        />
        <Checkbox
          name="featured"
          label="Featured on home"
          defaultChecked={project?.featured ?? false}
        />
      </Section>

      <Section title="Cover">
        <Field
          name="monogram"
          label="Monogram"
          required
          maxLength={4}
          defaultValue={project?.monogram}
          help="1–4 letters shown on the stylized cover"
          error={errors.monogram}
        />
        <Field
          name="accentFrom"
          label="Accent from"
          required
          defaultValue={project?.accentFrom ?? "#4f6ef7"}
          help="hex, e.g. #4f6ef7"
          error={errors.accentFrom}
        />
        <Field
          name="accentTo"
          label="Accent to"
          required
          defaultValue={project?.accentTo ?? "#22d3ee"}
          help="hex, e.g. #22d3ee"
          error={errors.accentTo}
        />
      </Section>

      <Section title="Links" className="md:col-span-2">
        <Field
          name="repoUrl"
          label="Repository URL"
          type="url"
          defaultValue={project?.repoUrl ?? ""}
          error={errors.repoUrl}
        />
        <Field
          name="demoUrl"
          label="Live demo URL"
          type="url"
          defaultValue={project?.demoUrl ?? ""}
          error={errors.demoUrl}
        />
        <Field
          name="caseUrl"
          label="External case study URL"
          type="url"
          defaultValue={project?.caseUrl ?? ""}
          error={errors.caseUrl}
        />
      </Section>

      <Section title="Stack & content" className="md:col-span-2">
        <Textarea
          name="stack"
          label="Stack"
          required
          rows={3}
          defaultValue={(project?.stack ?? []).join("\n")}
          help="one item per line (or comma-separated)"
          error={errors.stack}
        />
        <Textarea
          name="tagline"
          label="Tagline"
          rows={2}
          defaultValue={project?.tagline ?? ""}
          help="One short paragraph for the cards"
          error={errors.tagline}
        />
        <Textarea
          name="description"
          label="Long description"
          rows={6}
          defaultValue={project?.description ?? ""}
          help="Plain language. Shown on the detail page."
          error={errors.description}
        />
        <Textarea
          name="role"
          label="My role"
          rows={4}
          defaultValue={project?.role ?? ""}
          error={errors.role}
        />
        <Textarea
          name="features"
          label="Key features"
          rows={5}
          defaultValue={(project?.features ?? []).join("\n")}
          help="one bullet per line"
          error={errors.features}
        />
      </Section>

      {state.status === "error" && state.message ? (
        <p className="md:col-span-2 border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 font-mono text-[11px] tracking-[0.04em] text-[var(--red)]">
          {state.message === "db_unavailable"
            ? "Database is not configured. Set DATABASE_URL and run migrations first."
            : "Something went wrong saving the project. Try again."}
        </p>
      ) : null}

      <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] pt-6">
        <Link
          href="/admin"
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
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      className={cn(
        "flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-5",
        className
      )}
    >
      <legend className="px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
    >
      {children}
      {required ? <span className="text-[var(--accent)]">*</span> : null}
    </label>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] tracking-[0.02em] text-[var(--muted)]">{children}</p>
  );
}

function ErrorLine({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--red)]">{msg}</p>
  );
}

const inputClass =
  "border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 font-sans text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none";

function Field({
  name,
  label,
  required,
  type = "text",
  defaultValue,
  help,
  maxLength,
  error,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  defaultValue?: string | null;
  help?: string;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        maxLength={maxLength}
        className={inputClass}
      />
      {help ? <Help>{help}</Help> : null}
      <ErrorLine msg={error} />
    </div>
  );
}

function Textarea({
  name,
  label,
  required,
  defaultValue,
  rows = 3,
  help,
  error,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
  rows?: number;
  help?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      <textarea
        id={name}
        name={name}
        required={required}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className={cn(inputClass, "resize-y font-mono text-[13px]")}
      />
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
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ErrorLine msg={error} />
    </div>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-[12px] tracking-[0.02em] text-[var(--text-2)]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}
