import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { ApplicationForm } from "@/components/admin/application-form";

export const dynamic = "force-dynamic";

export default async function EditApplicationPage({
  params,
}: PageProps<"/admin/applications/[id]/edit">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  if (!dbConfigured) {
    return (
      <AdminShell email={session.user.email ?? "admin"}>
        <p className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 font-mono text-[11px] tracking-[0.04em] text-[var(--red)]">
          DATABASE_URL is not set.
        </p>
      </AdminShell>
    );
  }

  const { id } = await params;
  const a = await db.jobApplication.findUnique({ where: { id } });
  if (!a) notFound();

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <header className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
          Edit application
        </p>
        <h1 className="mt-2 font-display text-[1.6rem] font-bold tracking-tight text-[var(--text)]">
          {a.company}
        </h1>
      </header>
      <ApplicationForm
        application={{
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
          appliedAt: a.appliedAt ? a.appliedAt.toISOString().slice(0, 10) : null,
          followUp: a.followUp,
          notes: a.notes,
        }}
      />
    </AdminShell>
  );
}
