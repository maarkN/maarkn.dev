"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, ExternalLink } from "lucide-react";
import { DeleteApplicationButton } from "./delete-application-button";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/applications";

export type AppRow = {
  id: string;
  company: string;
  country: string | null;
  city: string | null;
  role: string | null;
  fit: string | null;
  source: string;
  status: string;
  careersUrl: string | null;
  jobUrl: string | null;
  sponsorsVisa: boolean;
  targetSalary: string | null;
  appliedAt: string | null;
};

const STATUS_TONE: Record<string, string> = {
  offer: "border-[var(--green)]/40 text-[var(--green)] bg-[var(--green)]/10",
  interview: "border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/10",
  replied: "border-[var(--accent)]/30 text-[var(--text-2)] bg-[var(--surface-2)]",
  applied: "border-[var(--border-2)] text-[var(--text-2)] bg-[var(--surface-2)]",
  rejected: "border-[var(--red)]/40 text-[var(--red)] bg-[var(--red)]/10",
  not_applied: "border-[var(--border-2)] text-[var(--muted)] bg-[var(--surface-2)]",
};

export function ApplicationsTable({ applications }: { applications: AppRow[] }) {
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [country, setCountry] = useState("all");
  const [q, setQ] = useState("");

  const countries = useMemo(
    () =>
      Array.from(
        new Set(applications.map((a) => a.country).filter(Boolean) as string[])
      ).sort(),
    [applications]
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return applications.filter(
      (a) =>
        (status === "all" || a.status === status) &&
        (source === "all" || a.source === source) &&
        (country === "all" || a.country === country) &&
        (!needle ||
          a.company.toLowerCase().includes(needle) ||
          (a.role ?? "").toLowerCase().includes(needle))
    );
  }, [applications, status, source, country, q]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All" },
            ...APPLICATION_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
          ]}
        />
        <FilterSelect
          label="Source"
          value={source}
          onChange={setSource}
          options={[
            { value: "all", label: "All" },
            ...APPLICATION_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
          ]}
        />
        <FilterSelect
          label="Country"
          value={country}
          onChange={setCountry}
          options={[
            { value: "all", label: "All" },
            ...countries.map((c) => ({ value: c, label: c })),
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Search
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="company or role…"
            className="border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-sans text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <span className="ml-auto self-center font-mono text-[11px] text-[var(--muted)]">
          {visible.length} of {applications.length}
        </span>
      </div>

      <div className="mt-6 overflow-x-auto border border-[var(--border)]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]">
            <tr>
              <Th>Company</Th>
              <Th className="hidden md:table-cell">Role</Th>
              <Th className="hidden lg:table-cell">Source</Th>
              <Th>Status</Th>
              <Th className="hidden lg:table-cell">Applied</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="bg-[var(--surface)] px-4 py-12 text-center text-[var(--muted)]">
                  No applications match these filters.
                </td>
              </tr>
            ) : (
              visible.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                >
                  <Td>
                    <p className="font-display text-[14px] font-semibold tracking-tight text-[var(--text)]">
                      {a.company}
                      {a.fit ? (
                        <span className="ml-2 font-mono text-[10px] text-[var(--muted)]">{a.fit}</span>
                      ) : null}
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.02em] text-[var(--muted)]">
                      {[a.country, a.city].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </Td>
                  <Td className="hidden md:table-cell text-[13px] text-[var(--text-2)]">{a.role || "—"}</Td>
                  <Td className="hidden lg:table-cell font-mono text-[11px] text-[var(--muted)]">
                    {SOURCE_LABELS[a.source as keyof typeof SOURCE_LABELS] ?? a.source}
                  </Td>
                  <Td>
                    <StatusPill status={a.status} />
                  </Td>
                  <Td className="hidden lg:table-cell font-mono text-[10px] text-[var(--muted)]">
                    {a.appliedAt || "—"}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      {a.jobUrl || a.careersUrl ? (
                        <a
                          href={(a.jobUrl || a.careersUrl)!}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          aria-label="Open posting"
                          title="Open posting"
                        >
                          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                        </a>
                      ) : null}
                      <Link
                        href={`/admin/applications/${a.id}/edit`}
                        className="inline-flex h-8 w-8 items-center justify-center border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                      </Link>
                      <DeleteApplicationButton id={a.id} company={a.company} />
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-sans text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}
function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.not_applied;
  return (
    <span className={`inline-flex border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${tone}`}>
      {STATUS_LABELS[status as ApplicationStatus] ?? status}
    </span>
  );
}
