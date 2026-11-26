import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ApplicationForm } from "@/components/admin/application-form";
import { PageHeader } from "@/components/admin/page-header";
import { StateMessage } from "@/components/admin/table-pager";
import { auth } from "@/lib/auth";
import { getAdminLabels } from "@/lib/admin/request";
import { db, dbConfigured } from "@/lib/db";
import { toDateInputValue } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditApplicationPage({
  params,
}: PageProps<"/admin/applications/[id]/edit">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const { applicationForm, vocab, common } = await getAdminLabels();

  // A3: without DATABASE_URL the page degrades instead of blowing up.
  if (!dbConfigured) {
    return (
      <AdminShell email={session.user.email ?? "admin"} translated>
        <div className="space-y-6 font-text">
          <PageHeader title={applicationForm.editDescription} />
          <StateMessage state="failed" message={common.states.noDatabase} />
        </div>
      </AdminShell>
    );
  }

  const { id } = await params;
  const application = await db.application.findUnique({
    where: { id },
    include: {
      company: { select: { name: true, folderName: true, careersUrl: true } },
      job: { select: { sourceUrl: true, title: true, locationText: true } },
    },
  });
  if (!application) notFound();

  const companyName = application.company?.name ?? application.folderName;

  return (
    <AdminShell email={session.user.email ?? "admin"} name={companyName} translated>
      <div className="space-y-8 font-text">
        <PageHeader
          title={companyName}
          description={application.roleTitle ?? application.job?.title ?? applicationForm.editDescription}
        />
        <ApplicationForm
          words={{ form: applicationForm, vocab }}
          application={{
            id: application.id,
            folderName: application.folderName,
            company: companyName,
            roleTitle: application.roleTitle,
            market: application.market,
            locationText: application.job?.locationText ?? null,
            stage: application.stage,
            sponsorship: application.sponsorship,
            source: application.source,
            fit: application.fit,
            priority: application.priority,
            careersUrl: application.company?.careersUrl ?? null,
            // URI sintético do cutover (`legacy://job/...`) não é URL válida
            // para o input `type="url"`: mostra vazio em vez de erro de campo.
            jobUrl: httpOnly(application.job?.sourceUrl),
            targetSalary: application.targetSalary,
            // A5: data de calendário — `toDateInputValue` lê em UTC, que é a
            // zona em que `appliedAt` foi gravada. Sem isso, cada save recuaria
            // a data em um dia.
            appliedAt: toDateInputValue(application.appliedAt),
            followUp: application.followUp,
            notesMd: application.notesMd,
          }}
        />
      </div>
    </AdminShell>
  );
}

function httpOnly(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}
