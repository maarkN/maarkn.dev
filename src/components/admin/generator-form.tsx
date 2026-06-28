"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { generate, type GenState } from "@/app/_actions/generator";
import { cn } from "@/lib/utils";

const initial: GenState = { status: "idle" };

const inputClass =
  "border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 font-sans text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none";

export function GeneratorForm() {
  const [state, run, pending] = useActionState<GenState, FormData>(generate, initial);

  return (
    <>
      <form
        action={run}
        className="flex flex-col gap-5 border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field name="roleTitle" label="Role title" placeholder="Senior Backend Engineer" />
          <Field name="company" label="Company" placeholder="Acme Inc." />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="language">Language</Label>
            <select id="language" name="language" defaultValue="en" className={inputClass}>
              <option value="en">English</option>
              <option value="pt-BR">Português (BR)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jobDescription" required>
            Job description
          </Label>
          <textarea
            id="jobDescription"
            name="jobDescription"
            required
            rows={10}
            placeholder="Paste the full job description here…"
            className={cn(inputClass, "resize-y font-mono text-[13px]")}
          />
        </div>

        {state.status === "error" ? (
          <p className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 font-mono text-[11px] tracking-[0.04em] text-[var(--red)]">
            {state.message === "unauthorized"
              ? "Session expired — sign in again."
              : state.message === "db_unavailable"
                ? "Database is not configured."
                : state.message}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] tracking-[0.02em] text-[var(--muted)]">
            Grounded in your CV/dossiers · never fabricates facts or a degree.
          </p>
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition disabled:cursor-not-allowed disabled:opacity-60",
              !pending && "hover:opacity-90"
            )}
          >
            {pending ? "Generating…" : "Generate"}
          </button>
        </div>
      </form>

      {state.status === "success" ? (
        <div className="mt-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
              Sources: {state.sources.join(" · ") || "—"}
            </p>
            {state.id ? (
              <Link
                href={`/admin/generator/${state.id}`}
                className="border border-[var(--border-2)] px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Open print view (PDF) →
              </Link>
            ) : null}
          </div>
          <ResultBlock title="Résumé" filename="resume.md" content={state.resume} />
          <ResultBlock title="Cover letter" filename="cover-letter.md" content={state.coverLetter} />
          <ResultBlock
            title="Screening answers"
            filename="screening-answers.md"
            content={state.screeningAnswers}
          />
        </div>
      ) : null}
    </>
  );
}

function ResultBlock({
  title,
  filename,
  content,
}: {
  title: string;
  filename: string;
  content: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const download = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btn =
    "border border-[var(--border-2)] px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]";

  return (
    <section className="border border-[var(--border)] bg-[var(--surface)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={copy} className={btn}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={download} className={btn}>
            .md
          </button>
        </div>
      </header>
      <pre className="max-h-[30rem] overflow-auto whitespace-pre-wrap px-4 py-4 font-mono text-[12.5px] leading-relaxed text-[var(--text-2)]">
        {content || "(empty)"}
      </pre>
    </section>
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

function Field({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <input id={name} name={name} type="text" placeholder={placeholder} className={inputClass} />
    </div>
  );
}
