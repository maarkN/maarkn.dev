import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { deleteApplication } from "@/app/_actions/applications";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { OpensRow, RowLink, SortableHead } from "@/components/admin/listing";
import { PageHeader } from "@/components/admin/page-header";
import { ResultNotice } from "@/components/admin/result-notice";
import { StageLabel } from "@/components/admin/stage";
import { TableStateRow } from "@/components/admin/table-pager";
import { ViewSwitch } from "@/components/admin/view-switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminDictionary } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getAdminFormat, getAdminLabels } from "@/lib/admin/request";
import { clearedHref, currentHref, parseSort, sortHref, type Sort } from "@/lib/admin/sort";
import { fill } from "@/lib/admin/text";
import { EMPTY } from "@/lib/format";
import {
  APPLICATION_SORT_KEYS,
  DEFAULT_APPLICATION_SORT,
  applicationsQueryKey,
  effectiveMarket,
  effectiveSponsorship,
  hasAnyApplicationFilter,
  listApplicationMarkets,
  listApplicationSources,
  listApplications,
  parseApplicationFilters,
  parsePage,
  type ApplicationFilters,
  type ApplicationSortKey,
} from "@/lib/applications-query";
import { ApplicationsToolbar } from "./applications-toolbar";

// Session guard + searchParams: this route is never prerendered.
export const dynamic = "force-dynamic";

const PATH = "/admin/applications";
const COLS = 7;

type Params = Record<string, string | string[] | undefined>;

/** On a phone the list keeps the company and the stage; the rest is in the dossier. */
const WIDE = "hidden md:table-cell";

export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params: Params = await searchParams;
  const filters = parseApplicationFilters(params);
  const page = parsePage(params.page);
  const sort = parseSort(params, APPLICATION_SORT_KEYS, DEFAULT_APPLICATION_SORT);
  const [markets, sources, labels] = await Promise.all([
    listApplicationMarkets(),
    listApplicationSources(),
    getAdminLabels(),
  ]);
  const { applications: words, vocab, common } = labels;

  // The form redirects here with ?created= / ?saved=: the notice says it once.
  // Text from the URL is only ever rendered as text, and cut short.
  const created = one(params.created).slice(0, 160);
  const saved = one(params.saved).slice(0, 160);
  const result = created
    ? fill(words.created, { name: created })
    : saved
      ? fill(words.saved, { name: saved })
      : null;

  const listQuery = new URLSearchParams();
  for (const key of ["q", "phase", "market", "route", "sponsorship", "source"] as const) {
    if (filters[key]) listQuery.set(key, filters[key]);
  }
  const boardHref = `${PATH}/board${listQuery.size ? `?${listQuery}` : ""}`;

  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      <div className="space-y-6 font-text">
        <PageHeader
          title={words.title}
          description={words.description}
          actions={
            <>
              <ViewSwitch current="list" listHref={PATH} boardHref={boardHref} words={words.views} />
              <Button asChild>
                <Link href={`${PATH}/new`}>
                  <Plus aria-hidden="true" />
                  {words.create}
                </Link>
              </Button>
            </>
          }
        />

        {result && <ResultNotice message={result} drop={["created", "saved"]} />}

        <div className="space-y-4">
          <ApplicationsToolbar
            {...filters}
            words={{ filters: words.filters, vocab, clear: common.states.clear }}
            markets={markets}
            sources={sources}
            page={page}
            sort={sort}
            position="top"
          />

          <Suspense
            key={applicationsQueryKey(filters, page, sort)}
            fallback={
              <ApplicationsTable params={params} sort={sort} words={words} sortBy={common.sort.by}>
                <TableStateRow cols={COLS} state="loading" message={words.states.loading} />
              </ApplicationsTable>
            }
          >
            <ApplicationsRows params={params} filters={filters} page={page} sort={sort} labels={labels} />
          </Suspense>
        </div>
      </div>
    </AdminShell>
  );
}

/* ── The rows (suspended: the only part that waits for the database) ──────── */

async function ApplicationsRows({
  params,
  filters,
  page,
  sort,
  labels,
}: {
  params: Params;
  filters: ApplicationFilters;
  page: number;
  sort: Sort<ApplicationSortKey>;
  labels: AdminDictionary;
}) {
  const { applications: words, vocab, common } = labels;
  const { formatDate, formatDateTime } = await getAdminFormat();
  const result = await listApplications({ filters, page, sort });

  return (
    <>
      <ApplicationsTable params={params} sort={sort} words={words} sortBy={common.sort.by}>
        {result.failed ? (
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
        ) : result.rows.length === 0 ? (
          hasAnyApplicationFilter(filters) ? (
            <TableStateRow
              cols={COLS}
              state="filtered"
              message={words.states.filtered}
              action={{ href: clearedHref(PATH), label: common.states.clear }}
            />
          ) : (
            <TableStateRow
              cols={COLS}
              state="empty"
              message={words.states.empty}
              action={{ href: `${PATH}/new`, label: words.create }}
            />
          )
        ) : (
          result.rows.map((row) => {
            const sponsorship = effectiveSponsorship(row);
            const companyName = row.company?.name ?? row.folderName;
            const roleTitle = row.roleTitle || row.job?.title || EMPTY;
            const place = [effectiveMarket(row), row.job?.locationText].filter(Boolean).join(" · ");
            const jobUrl = row.job?.sourceUrl;
            // A synthetic URI of the cutover (`legacy://`, `demo://`) is not a link.
            const linkable = Boolean(jobUrl && /^https?:\/\//i.test(jobUrl));
            const dossier = `${PATH}/${row.id}`;
            return (
              <OpensRow key={row.id} href={dossier}>
                <TableCell className="max-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <RowLink href={dossier} title={companyName} className="truncate">
                      {companyName}
                    </RowLink>
                    {row.priority != null && (
                      <span
                        className="shrink-0 font-label text-xs text-warn"
                        title={fill(words.priority, { n: row.priority })}
                      >
                        P{row.priority}
                      </span>
                    )}
                  </div>
                  {row.fit && <div className="truncate text-sm text-muted-foreground">{row.fit}</div>}
                </TableCell>
                <TableCell className={`${WIDE} max-w-0`}>
                  <div className="truncate" title={roleTitle}>
                    {roleTitle}
                  </div>
                  {place && (
                    <div className="truncate text-sm text-muted-foreground" title={place}>
                      {place}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <StageLabel stage={row.stage} words={vocab} />
                </TableCell>
                <TableCell className={`${WIDE} max-w-0`}>
                  {sponsorship ? (
                    <span className="block truncate" title={vocab.visaHint[sponsorship]}>
                      {vocab.visa[sponsorship]}
                    </span>
                  ) : (
                    EMPTY
                  )}
                  {row.sponsorship === null && row.job && (
                    <span className="block text-sm text-muted-foreground">{words.inherited}</span>
                  )}
                </TableCell>
                <TableCell className={`${WIDE} font-label text-xs whitespace-nowrap`}>{formatDate(row.appliedAt)}</TableCell>
                <TableCell className={`${WIDE} font-label text-xs whitespace-nowrap`}>
                  {formatDateTime(row.updatedAt)}
                </TableCell>
                <TableCell className={`${WIDE} text-right`}>
                  <div className="inline-flex items-center gap-1.5">
                    {linkable && (
                      <Button asChild variant="ghost" size="icon-sm">
                        <a
                          href={jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={fill(words.openJob, { name: companyName })}
                          title={fill(words.openJob, { name: companyName })}
                        >
                          <ExternalLink aria-hidden="true" />
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link
                        href={`${PATH}/${row.id}/edit`}
                        aria-label={fill(words.edit, { name: companyName })}
                        title={fill(words.edit, { name: companyName })}
                      >
                        <Pencil aria-hidden="true" />
                      </Link>
                    </Button>
                    <ConfirmDelete
                      id={row.id}
                      name={companyName}
                      title={fill(words.delete.title, { name: companyName })}
                      lost={words.delete.lost}
                      confirmLabel={words.delete.confirm}
                      triggerLabel={fill(words.delete.trigger, { name: companyName })}
                      action={deleteApplication}
                    />
                  </div>
                </TableCell>
              </OpensRow>
            );
          })
        )}
      </ApplicationsTable>

      <ApplicationsToolbar
        {...filters}
        page={result.page}
        totalPages={result.totalPages}
        total={result.failed ? undefined : result.total}
        sort={sort}
        position="bottom"
      />
    </>
  );
}

/** The header of the table, shared by the loading state and the data. */
function ApplicationsTable({
  params,
  sort,
  words,
  sortBy,
  children,
}: {
  params: Params;
  sort: Sort<ApplicationSortKey>;
  words: AdminDictionary["applications"];
  /** "Ordenar por {column}". */
  sortBy: string;
  children: React.ReactNode;
}) {
  const { columns } = words;
  const head = (key: ApplicationSortKey, label: string, className?: string, first: "asc" | "desc" = "asc") => (
    <SortableHead
      label={label}
      title={fill(sortBy, { column: label.toLowerCase() })}
      href={sortHref(PATH, params, sort, key, first)}
      dir={sort.key === key ? sort.dir : undefined}
      className={className}
    />
  );
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          {head("company", columns.company, "w-[45%] md:w-auto")}
          <TableHead className={WIDE}>{columns.role}</TableHead>
          {head("stage", columns.stage, "w-[55%] md:w-48")}
          <TableHead className={`${WIDE} w-52`}>{columns.visa}</TableHead>
          {head("sent", columns.sent, `${WIDE} w-28`, "desc")}
          {head("updated", columns.updated, `${WIDE} w-36`, "desc")}
          <TableHead className={`${WIDE} w-36 text-right`}>{columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}
