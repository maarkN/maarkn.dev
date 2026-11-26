import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Plus, Star } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { deleteProject } from "@/app/_actions/admin-projects";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { OpensRow, RowLink, SortableHead } from "@/components/admin/listing";
import { PageHeader } from "@/components/admin/page-header";
import { TableStateRow } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminDictionary } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { getAdminFormat, getAdminLabels } from "@/lib/admin/request";
import { clearedHref, currentHref, parseSort, sortHref, type Sort } from "@/lib/admin/sort";
import { fill } from "@/lib/admin/text";
import type { ProjectCategory, ProjectStatus, SourceVisibility } from "@/lib/projects";
import { safeDbError } from "@/lib/safe-error";
import { ProjectsToolbar } from "./projects-toolbar";

// Session guard + searchParams: this route is never prerendered.
export const dynamic = "force-dynamic";

const PATH = "/admin/projects";
const PAGE_SIZE = 20;
const COLS = 7;
/** Columns that only fit from a laptop (1024 px) and from a desktop (1280 px) up. */
const LG = "hidden lg:table-cell";
const XL = "hidden xl:table-cell";

const SORT_KEYS = ["name", "updated"] as const;
type SortKey = (typeof SORT_KEYS)[number];
/** What moved last, first. */
const DEFAULT_SORT: Sort<SortKey> = { key: "updated", dir: "desc" };

type Params = Record<string, string | string[] | undefined>;
type Filters = { q: string; category: string; status: string };

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function ProjectsPage({ searchParams }: PageProps<"/admin/projects">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params: Params = await searchParams;
  const filters: Filters = { q: one(params.q).slice(0, 120), category: one(params.category), status: one(params.status) };
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);
  const sort = parseSort(params, SORT_KEYS, DEFAULT_SORT);
  const labels = await getAdminLabels();
  const { projects: words, vocab, common } = labels;

  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      <div className="space-y-6 font-text">
        <PageHeader
          title={words.title}
          description={words.description}
          actions={
            <Button asChild>
              <Link href={`${PATH}/new`}>
                <Plus aria-hidden="true" />
                {words.create}
              </Link>
            </Button>
          }
        />

        <div className="space-y-4">
          <ProjectsToolbar
            {...filters}
            words={{ filters: words.filters, vocab, clear: common.states.clear }}
            page={page}
            sort={sort}
            position="top"
          />
          <Suspense
            key={`${filters.q}|${filters.category}|${filters.status}|${page}|${sort.key}:${sort.dir}`}
            fallback={
              <ProjectsTable params={params} sort={sort} labels={labels}>
                <TableStateRow cols={COLS} state="loading" message={words.states.loading} />
              </ProjectsTable>
            }
          >
            <ProjectsRows params={params} filters={filters} page={page} sort={sort} labels={labels} />
          </Suspense>
        </div>
      </div>
    </AdminShell>
  );
}

async function ProjectsRows({
  params,
  filters,
  page: asked,
  sort,
  labels,
}: {
  params: Params;
  filters: Filters;
  page: number;
  sort: Sort<SortKey>;
  labels: AdminDictionary;
}) {
  const { projects: words, vocab, common } = labels;
  const { formatDateTime } = await getAdminFormat();
  const where: Prisma.ProjectWhereInput = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" as const } },
            { slug: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    sort.key === "name"
      ? [{ name: sort.dir }, { id: "asc" }]
      : [{ updatedAt: sort.dir }, { id: "asc" }];

  // A3: `next build` runs without DATABASE_URL: degrade, never throw.
  let rows: Awaited<ReturnType<typeof db.project.findMany>> = [];
  let total = 0;
  let page = asked;
  let failed = !dbConfigured;
  if (dbConfigured) {
    try {
      // Counted first, to keep the page inside the list: `?page=99` shows the last one.
      total = await db.project.count({ where });
      page = Math.min(asked, Math.max(1, Math.ceil(total / PAGE_SIZE)));
      rows = await db.project.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
    } catch (err) {
      console.error("[admin] list projects failed", safeDbError(err));
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(filters.q || filters.category || filters.status);

  return (
    <>
      <ProjectsTable params={params} sort={sort} labels={labels}>
        {failed ? (
          dbConfigured ? (
            <TableStateRow
              cols={COLS}
              state="failed"
              message={words.states.failed}
              action={{ href: currentHref(PATH, params), label: common.retry }}
            />
          ) : (
            <TableStateRow cols={COLS} state="failed" message={common.states.noDatabase} />
          )
        ) : rows.length === 0 ? (
          filtered ? (
            <TableStateRow
              cols={COLS}
              state="filtered"
              message={words.states.filtered}
              action={{ href: clearedHref(PATH), label: common.states.clear }}
            />
          ) : (
            <TableStateRow cols={COLS} state="empty" message={words.states.empty} action={{ href: `${PATH}/new`, label: words.create }} />
          )
        ) : (
          rows.map((p) => {
            const editor = `${PATH}/${p.id}/edit`;
            return (
              <OpensRow key={p.id} href={editor}>
                <TableCell className="max-w-0">
                  <div className="flex items-center gap-3">
                    {/* The project's own colours: an exception of the colour audit, with its reason. */}
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center font-label text-[11px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${p.accentFrom}, ${p.accentTo})` }}
                    >
                      {p.monogram}
                    </span>
                    <div className="min-w-0">
                      <RowLink href={editor} title={p.name} className="block truncate">
                        {p.name}
                      </RowLink>
                      <div className="truncate font-label text-xs text-muted-foreground">
                        /{p.slug} · {p.year}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={LG}>{vocab.projectCategory[p.category as ProjectCategory] ?? p.category}</TableCell>
                <TableCell className={LG}>{vocab.projectStatus[p.status as ProjectStatus] ?? p.status}</TableCell>
                <TableCell className={XL}>{vocab.visibility[p.sourceVisibility as SourceVisibility] ?? p.sourceVisibility}</TableCell>
                <TableCell className={XL}>
                  {p.featured ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Star aria-hidden="true" className="size-4 fill-current text-warn" />
                      {words.featured}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className={`${XL} font-label text-xs whitespace-nowrap`}>{formatDateTime(p.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link href={editor} aria-label={fill(words.edit, { name: p.name })} title={fill(words.edit, { name: p.name })}>
                        <Pencil aria-hidden="true" />
                      </Link>
                    </Button>
                    <ConfirmDelete
                      id={p.id}
                      name={p.name}
                      title={fill(words.delete.title, { name: p.name })}
                      lost={fill(words.delete.lost, { slug: p.slug })}
                      confirmLabel={words.delete.confirm}
                      triggerLabel={fill(words.delete.trigger, { name: p.name })}
                      action={deleteProject}
                    />
                  </div>
                </TableCell>
              </OpensRow>
            );
          })
        )}
      </ProjectsTable>

      <ProjectsToolbar {...filters} page={page} totalPages={totalPages} total={failed ? undefined : total} sort={sort} position="bottom" />
    </>
  );
}

/** The header of the table, shared by the loading state and the data. */
function ProjectsTable({
  params,
  sort,
  labels,
  children,
}: {
  params: Params;
  sort: Sort<SortKey>;
  labels: AdminDictionary;
  children: React.ReactNode;
}) {
  const { columns } = labels.projects;
  const head = (key: SortKey, label: string, className: string, first: "asc" | "desc") => (
    <SortableHead
      label={label}
      title={fill(labels.common.sort.by, { column: label.toLowerCase() })}
      href={sortHref(PATH, params, sort, key, first)}
      dir={sort.key === key ? sort.dir : undefined}
      className={className}
    />
  );
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          {head("name", columns.project, "w-auto", "asc")}
          <TableHead className={`${LG} w-32`}>{columns.category}</TableHead>
          <TableHead className={`${LG} w-32`}>{columns.status}</TableHead>
          <TableHead className={`${XL} w-28`}>{columns.source}</TableHead>
          <TableHead className={`${XL} w-36`}>{columns.featured}</TableHead>
          {head("updated", columns.updated, `${XL} w-40`, "desc")}
          <TableHead className="w-28 text-right">{columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
