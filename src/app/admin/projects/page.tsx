import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Plus, Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteProjectButton } from "@/components/admin/delete-project-button";
import { PageHeader } from "@/components/admin/page-header";
import {
  ProjectCategoryBadge,
  ProjectStatusBadge,
  VisibilityBadge,
} from "@/components/admin/status-badge";
import {
  ListingIndexCell,
  ListingIndexHead,
  TableEmptyRow,
  TableLoadingRow,
} from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectsToolbar } from "./projects-toolbar";

/** Guard + searchParams: never prerender this route. */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
// A coluna de índice conta: `colSpan` que mentir deixa a linha vazia curta.
const COLS = 8;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function ProjectsPage({
  searchParams,
}: PageProps<"/admin/projects">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const sp = await searchParams; // Next 16: searchParams is a Promise
  const q = one(sp.q);
  const category = one(sp.category);
  const status = one(sp.status);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          title="Projetos"
          description="Catálogo do portfólio público. O slug vira a URL em /projects e os destaques abrem a home."
          actions={
            <Button size="sm" asChild>
              <Link href="/admin/projects/new">
                <Plus className="size-4" />
                [ novo projeto ]
              </Link>
            </Button>
          }
        />

        <Suspense
          key={`${q}|${category}|${status}|${page}`}
          fallback={<ProjectsTableSkeleton />}
        >
          <ProjectsTable
            q={q}
            category={category}
            status={status}
            page={page}
          />
        </Suspense>
      </div>
    </AdminShell>
  );
}

/* ── table ────────────────────────────────────────────────────────────────── */

function ProjectsTableHead() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <ListingIndexHead />
        <TableHead>projeto</TableHead>
        <TableHead className="w-[12ch]">categoria</TableHead>
        <TableHead className="w-[12ch]">status</TableHead>
        <TableHead className="w-[12ch]">fonte</TableHead>
        <TableHead className="w-[12ch]">destaque</TableHead>
        <TableHead className="w-[20ch]">atualizado</TableHead>
        <TableHead className="w-[12ch] text-right">acoes</TableHead>
      </TableRow>
    </TableHeader>
  );
}

/** State 1 of §3: loading. */
function ProjectsTableSkeleton() {
  return (
    <Table className="table-fixed">
      <ProjectsTableHead />
      <TableBody>
        <TableLoadingRow cols={COLS} />
      </TableBody>
    </Table>
  );
}

async function ProjectsTable({
  q,
  category,
  status,
  page,
}: {
  q: string;
  category: string;
  status: string;
  page: number;
}) {
  const where = {
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // A3: `next build` runs without DATABASE_URL — degrade, never throw.
  let rows: Awaited<ReturnType<typeof db.project.findMany>> = [];
  let total = 0;
  let failed = false;
  if (dbConfigured) {
    try {
      [rows, total] = await Promise.all([
        db.project.findMany({
          where,
          orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        db.project.count({ where }),
      ]);
    } catch (err) {
      console.error("[admin] list projects failed", err);
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-3">
      <ProjectsToolbar
        q={q}
        category={category}
        status={status}
        page={page}
        totalPages={totalPages}
        total={total}
        position="top"
      />

      <Table className="table-fixed">
        <ProjectsTableHead />
        <TableBody>
          {failed || !dbConfigured ? (
          <TableEmptyRow
            cols={COLS}
            destructive
            message={
              dbConfigured
                ? "Não foi possível carregar os projetos."
                : "Banco indisponível: DATABASE_URL não está configurada."
            }
          />
        ) : rows.length === 0 ? (
          <TableEmptyRow cols={COLS} />
        ) : (
          rows.map((p, index) => (
            <TableRow key={p.id}>
              <ListingIndexCell index={index} />
              <TableCell>
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center font-display text-[11px] font-bold tracking-tight text-white"
                    style={{
                      background: `linear-gradient(135deg, ${p.accentFrom}, ${p.accentTo})`,
                    }}
                  >
                    {p.monogram}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium" title={p.name}>
                      {p.name}
                    </div>
                    <div
                      className="truncate text-xs text-muted-foreground"
                      title={`/${p.slug} · ${p.year}`}
                    >
                      /{p.slug} · {p.year}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <ProjectCategoryBadge status={p.category} />
                </TableCell>
                <TableCell>
                  <ProjectStatusBadge status={p.status} />
                </TableCell>
                <TableCell>
                  <VisibilityBadge status={p.sourceVisibility} />
                </TableCell>
                <TableCell>
                  {p.featured ? (
                    <Star
                      className="size-4 fill-current text-amber-400"
                      aria-label="Em destaque"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatDateTime(p.updatedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      asChild
                      aria-label={`Editar ${p.name}`}
                      title="Editar"
                    >
                      <Link href={`/admin/projects/${p.id}/edit`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <DeleteProjectButton id={p.id} name={p.name} slug={p.slug} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ProjectsToolbar
        q={q}
        category={category}
        status={status}
        page={page}
        totalPages={totalPages}
        total={total}
        position="bottom"
      />
    </div>
  );
}
