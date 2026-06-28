import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { decodeStringList } from "@/lib/json-list";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProjectForm } from "@/components/admin/project-form";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: PageProps<"/admin/projects/[id]/edit">) {
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
  const project = await db.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <header className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
          Edit project
        </p>
        <h1 className="mt-2 font-display text-[1.6rem] font-bold tracking-tight text-[var(--text)]">
          {project.name}
        </h1>
      </header>
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
    </AdminShell>
  );
}
