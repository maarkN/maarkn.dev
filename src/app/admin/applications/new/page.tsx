import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { ApplicationForm } from "@/components/admin/application-form";

export const dynamic = "force-dynamic";

export default async function NewApplicationPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <header className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
          New application
        </p>
        <h1 className="mt-2 font-display text-[1.6rem] font-bold tracking-tight text-[var(--text)]">
          Track a new role
        </h1>
      </header>
      <ApplicationForm />
    </AdminShell>
  );
}
