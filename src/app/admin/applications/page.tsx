import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { ApplicationsTable, type AppRow } from "@/components/admin/applications-table";

export const dynamic = "force-dynamic";

function ymd(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export default async function ApplicationsPage({
  searchParams,
}: PageProps<"/admin/applications">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const params = await searchParams;
  const created = pick(params.created);
  const updated = pick(params.updated);

  const rows = dbConfigured
    ? await db.jobApplication.findMany({ orderBy: [{ status: "asc" }, { updatedAt: "desc" }] })
    : [];

  const applications: AppRow[] = rows.map((a) => ({
    id: a.id,
    company: a.company,
    country: a.country,
    city: a.city,
    role: a.role,
    fit: a.fit,
    source: a.source,
    status: a.status,
    careersUrl: a.careersUrl,
    jobUrl: a.jobUrl,
    sponsorsVisa: a.sponsorsVisa,
    targetSalary: a.targetSalary,
    appliedAt: ymd(a.appliedAt),
  }));

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
            Applications
          </p>
          <h1 className="mt-2 font-display text-[1.8rem] font-bold tracking-tight text-[var(--text)]">
            Job application tracker
          </h1>
          <p className="mt-2 max-w-xl text-sm font-light text-[var(--muted)]">
            Every role you target — where it came from, status, salary target and follow-ups.
          </p>
        </div>
        <Link
          href="/admin/applications/new"
          className="inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          New application
        </Link>
      </div>

      {created ? <Banner>Added &ldquo;{created}&rdquo;.</Banner> : null}
      {updated ? <Banner>Updated &ldquo;{updated}&rdquo;.</Banner> : null}
      {!dbConfigured ? <Banner warn>DATABASE_URL is not set — the list is empty until Postgres runs.</Banner> : null}

      <div className="mt-8">
        <ApplicationsTable applications={applications} />
      </div>
    </AdminShell>
  );
}

function pick(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0]! : v;
}

function Banner({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  const cls = warn
    ? "border-[var(--red)]/40 bg-[var(--red)]/10 text-[var(--red)]"
    : "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]";
  return (
    <p className={`mt-6 inline-block border px-3 py-2 font-mono text-[11px] tracking-[0.04em] ${cls}`}>
      {children}
    </p>
  );
}
