import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProjectForm } from "@/components/admin/project-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <header className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
          New project
        </p>
        <h1 className="mt-2 font-display text-[1.6rem] font-bold tracking-tight text-[var(--text)]">
          Create a new project
        </h1>
        <p className="mt-2 max-w-xl text-sm font-light text-[var(--muted)]">
          The slug becomes the URL on /projects. Featured projects appear on the home page.
        </p>
      </header>
      <ProjectForm />
    </AdminShell>
  );
}
