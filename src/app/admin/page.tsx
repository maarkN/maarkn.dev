import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteProjectButton } from "@/components/admin/delete-project-button";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: PageProps<"/admin">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const params = await searchParams;
  const created = pickFlag(params.created);
  const updated = pickFlag(params.updated);

  const projects = dbConfigured
    ? await db.project.findMany({ orderBy: [{ featured: "desc" }, { updatedAt: "desc" }] })
    : [];

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
            Projects
          </p>
          <h1 className="mt-2 font-display text-[1.8rem] font-bold tracking-tight text-[var(--text)]">
            Manage portfolio projects
          </h1>
          <p className="mt-2 max-w-xl text-sm font-light text-[var(--muted)]">
            Create, edit and remove the entries that surface on the public site. Public read-path will
            switch to this database in the next sub-phase.
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          New project
        </Link>
      </div>

      {created ? (
        <Banner tone="ok">Created project &ldquo;{created}&rdquo;.</Banner>
      ) : null}
      {updated ? (
        <Banner tone="ok">Updated project &ldquo;{updated}&rdquo;.</Banner>
      ) : null}

      {!dbConfigured ? (
        <Banner tone="warn">
          DATABASE_URL is not set. The list below will be empty until Postgres is running.
        </Banner>
      ) : null}

      <div className="mt-10 overflow-x-auto border border-[var(--border)]">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]">
            <tr>
              <Th>Project</Th>
              <Th className="hidden md:table-cell">Category</Th>
              <Th className="hidden md:table-cell">Status</Th>
              <Th className="hidden md:table-cell">Featured</Th>
              <Th className="hidden md:table-cell">Updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="bg-[var(--surface)] px-4 py-12 text-center text-[var(--muted)]">
                  No projects yet. Click &ldquo;New project&rdquo; to create the first one.
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center font-display text-[11px] font-bold tracking-[-0.02em] text-white"
                        style={{
                          background: `linear-gradient(135deg, ${p.accentFrom}, ${p.accentTo})`,
                        }}
                      >
                        {p.monogram}
                      </span>
                      <div>
                        <p className="font-display text-[14px] font-semibold tracking-tight text-[var(--text)]">
                          {p.name}
                        </p>
                        <p className="font-mono text-[10px] tracking-[0.02em] text-[var(--muted)]">
                          /{p.slug} · {p.year}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="hidden md:table-cell font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
                    {p.category}
                  </Td>
                  <Td className="hidden md:table-cell">
                    <StatusPill status={p.status} />
                  </Td>
                  <Td className="hidden md:table-cell font-mono text-[11px] text-[var(--muted)]">
                    {p.featured ? "yes" : "—"}
                  </Td>
                  <Td className="hidden md:table-cell font-mono text-[10px] tracking-[0.02em] text-[var(--muted)]">
                    {formatDate(p.updatedAt)}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/admin/projects/${p.id}/edit`}
                        className="inline-flex h-8 w-8 items-center justify-center border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                      </Link>
                      <DeleteProjectButton id={p.id} name={p.name} />
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function pickFlag(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0]! : v;
}

function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "live"
      ? "border-[var(--green)]/40 text-[var(--green)] bg-[var(--green)]/10"
      : "border-[var(--border-2)] text-[var(--muted)] bg-[var(--surface-2)]";
  return (
    <span
      className={`inline-flex border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${tone}`}
    >
      {status}
    </span>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "ok" | "warn";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
      : "border-[var(--red)]/40 bg-[var(--red)]/10 text-[var(--red)]";
  return (
    <p
      className={`mt-6 inline-block border px-3 py-2 font-mono text-[11px] tracking-[0.04em] ${cls}`}
    >
      {children}
    </p>
  );
}
