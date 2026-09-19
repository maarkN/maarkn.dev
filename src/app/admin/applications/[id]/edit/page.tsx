import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ApplicationForm } from "@/components/admin/application-form";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { toDateInputValue } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditApplicationPage({
  params,
}: PageProps<"/admin/applications/[id]/edit">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  // A3: sem DATABASE_URL a página degrada em vez de explodir.
  if (!dbConfigured) {
    return (
      <AdminShell email={session.user.email ?? "admin"}>
        <div className="space-y-4">
          <PageHeader
            title="Editar candidatura"
          />
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              DATABASE_URL não configurada — não é possível carregar a
              candidatura.
            </CardContent>
          </Card>
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
    <AdminShell email={session.user.email ?? "admin"} name={application.folderName}>
      <div className="space-y-4">
        <PageHeader
          title={companyName}
          description={
            application.roleTitle ??
            application.job?.title ??
            "Editar candidatura"
          }
        />
        <ApplicationForm
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
