import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ApplicationForm } from "@/components/admin/application-form";
import { PageHeader } from "@/components/admin/page-header";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewApplicationPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          title="Nova candidatura"
          description="Registre uma vaga que você mira, mesmo antes de aplicar."
          backHref="/admin/applications"
          backLabel="Candidaturas"
        />
        <ApplicationForm />
      </div>
    </AdminShell>
  );
}
