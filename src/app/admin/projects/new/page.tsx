import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import { ProjectForm } from "@/components/admin/project-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          backHref="/admin/projects"
          backLabel="Projetos"
          title="Novo projeto"
          description="O slug vira a URL em /projects. Projetos em destaque aparecem na home."
        />
        <ProjectForm />
      </div>
    </AdminShell>
  );
}
