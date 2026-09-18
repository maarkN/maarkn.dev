import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { decodeStringList } from "@/lib/json-list";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import { ProjectForm } from "@/components/admin/project-form";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: PageProps<"/admin/projects/[id]/edit">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  // A3: without DATABASE_URL the page degrades instead of throwing.
  if (!dbConfigured) {
    return (
      <AdminShell email={session.user.email ?? "admin"}>
        <div className="space-y-4">
          <PageHeader
            backHref="/admin/projects"
            backLabel="Projetos"
            title="Editar projeto"
          />
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              Banco indisponível: DATABASE_URL não está configurada.
            </CardContent>
          </Card>
        </div>
      </AdminShell>
    );
  }

  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          backHref="/admin/projects"
          backLabel="Projetos"
          title={project.name}
          description={`/${project.slug} · ${project.year}`}
        />
        <ProjectForm
          project={{
            id: project.id,
            slug: project.slug,
            name: project.name,
            year: project.year,
            category: project.category,
            status: project.status,
            featured: project.featured,
            monogram: project.monogram,
            accentFrom: project.accentFrom,
            accentTo: project.accentTo,
            // String-JSON columns stay String-JSON in this phase (F1 decides).
            stack: decodeStringList(project.stackJson),
            sourceVisibility: project.sourceVisibility,
            repoUrl: project.repoUrl,
            demoUrl: project.demoUrl,
            caseUrl: project.caseUrl,
            tagline: project.tagline,
            description: project.description,
            role: project.role,
            features: decodeStringList(project.featuresJson),
            coverImage: project.coverImage,
          }}
        />
      </div>
    </AdminShell>
  );
}
