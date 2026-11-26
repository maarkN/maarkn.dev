import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ApplicationForm } from "@/components/admin/application-form";
import { PageHeader } from "@/components/admin/page-header";
import { auth } from "@/lib/auth";
import { getAdminLabels } from "@/lib/admin/request";

export const dynamic = "force-dynamic";

export default async function NewApplicationPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1
  const { applicationForm, vocab } = await getAdminLabels();

  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      <div className="space-y-8 font-text">
        <PageHeader title={applicationForm.newTitle} description={applicationForm.newDescription} />
        <ApplicationForm words={{ form: applicationForm, vocab }} />
      </div>
    </AdminShell>
  );
}
