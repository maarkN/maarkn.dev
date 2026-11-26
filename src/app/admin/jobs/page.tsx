import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Info } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { SortableHead } from "@/components/admin/listing";
import { PageHeader } from "@/components/admin/page-header";
import { StageLabel } from "@/components/admin/stage";
import { TableStateRow } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminDictionary } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getAdminFormat, getAdminLabels } from "@/lib/admin/request";
import { clearedHref, currentHref, parseSort, sortHref, type Sort } from "@/lib/admin/sort";
import { counted, fill } from "@/lib/admin/text";
import { EMPTY, type Format } from "@/lib/format";
import { JobsToolbar } from "./jobs-toolbar";
import { PromoteJobButton } from "./promote-job-button";
import {
  DEFAULT_JOB_SORT,
  JOB_SORT_KEYS,
  countUnmappedRadarHits,
  effectiveScore,
  hasAnyJobFilter,
  jobsQueryKey,
  latestHit,
  latestVerification,
  linkedApplication,
  listJobMarkets,
  listJobs,
  listRadarVerdicts,
  parseJobFilters,
  parseJobsPage,
  type JobFilters,
  type JobListRow,
  type JobSortKey,
} from "./jobs-query";
import { jobBoard } from "./radar";

/**
 * The radar of jobs: where a job is judged BEFORE it becomes an application:
 * score, verdict of the scan and its reason, visa, board and date of posting,
 * and one button that matters, promoting it to an application.
 *
 * A job has no page of its own, so its row opens nothing: the posting is a link
 * of its own, and the application, when there is one, another.
 *
 * ~190 jobs: filter and pages are applied by the server (`./jobs-query`).
 */

// Session guard + searchParams: this route is never prerendered.
export const dynamic = "force-dynamic";

const PATH = "/admin/jobs";
const COLS = 7;
/** Columns that only fit from a laptop (1024 px) and from a desktop (1280 px) up. */
const LG = "hidden lg:table-cell";
const XL = "hidden xl:table-cell";

type Params = Record<string, string | string[] | undefined>;

export default async function JobsPage({ searchParams }: PageProps<"/admin/jobs">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params: Params = await searchParams;
  const filters = parseJobFilters(params);
  const page = parseJobsPage(params.page);
  const sort = parseSort(params, JOB_SORT_KEYS, DEFAULT_JOB_SORT);
  const [markets, verdicts, unmappedHits, { formatNumber }, labels] = await Promise.all([
    listJobMarkets(),
    listRadarVerdicts(),
    countUnmappedRadarHits(),
    getAdminFormat(),
    getAdminLabels(),
  ]);
  const { jobs: words, vocab, common } = labels;

  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      <div className="space-y-6 font-text">
        <PageHeader
          title={words.title}
          description={words.description}
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/applications">{words.applications}</Link>
            </Button>
          }
        />

        <div className="space-y-4">
          <JobsToolbar
            {...filters}
            words={{ filters: words.filters, vocab, clear: common.states.clear }}
            markets={markets}
            verdicts={verdicts}
            page={page}
            sort={sort}
            position="top"
          />

          <Suspense
            key={jobsQueryKey(filters, page, sort)}
            fallback={
              <JobsTable params={params} sort={sort} labels={labels}>
                <TableStateRow cols={COLS} state="loading" message={words.states.loading} />
              </JobsTable>
            }
          >
            <JobsRows params={params} filters={filters} page={page} sort={sort} labels={labels} />
          </Suspense>
        </div>

        {unmappedHits > 0 && (
          <div className="flex max-w-[72ch] items-start gap-2 text-sm text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              {counted(words.unmapped, unmappedHits, formatNumber(unmappedHits))} {words.unmappedHelp}
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

/* ── The rows (suspended: the only part that waits for the database) ──────── */

async function JobsRows({
  params,
  filters,
  page,
  sort,
  labels,
}: {
  params: Params;
  filters: JobFilters;
  page: number;
  sort: Sort<JobSortKey>;
  labels: AdminDictionary;
}) {
  const { jobs: words, common } = labels;
  const [result, format] = await Promise.all([listJobs({ filters, page, sort }), getAdminFormat()]);

  return (
    <>
      <JobsTable params={params} sort={sort} labels={labels}>
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
          hasAnyJobFilter(filters) ? (
            <TableStateRow
              cols={COLS}
              state="filtered"
              message={words.states.filtered}
              action={{ href: clearedHref(PATH), label: common.states.clear }}
            />
          ) : (
            <TableStateRow cols={COLS} state="empty" message={words.states.empty} />
          )
        ) : (
          result.rows.map((row) => <JobRow key={row.id} row={row} format={format} labels={labels} />)
        )}
      </JobsTable>

      <JobsToolbar
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

function JobRow({ row, format, labels }: { row: JobListRow; format: Format; labels: AdminDictionary }) {
  const { jobs: words, vocab, applications } = labels;
  const { formatDate, formatNumber } = format;
  const hit = latestHit(row);
  const verification = latestVerification(row);
  const application = linkedApplication(row);
  const score = effectiveScore(row);
  // A synthetic URI (`demo://`, what the cutover created for a line without a
  // link) is not clickable: `jobBoard` returns `null` for those.
  const board = jobBoard(row.sourceUrl);
  const companyName = row.company?.name ?? hit?.companyName ?? null;
  const jobLabel = `${row.title}${companyName ? `, ${companyName}` : ""}`;
  const place = [
    row.market,
    row.locationText,
    row.workMode ? (vocab.workMode[row.workMode as keyof typeof vocab.workMode] ?? row.workMode) : null,
    row.employmentType
      ? (vocab.employmentType[row.employmentType as keyof typeof vocab.employmentType] ?? row.employmentType)
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const verdict = hit?.verdict ? (vocab.verdict[hit.verdict as keyof typeof vocab.verdict] ?? hit.verdict) : null;

  return (
    <TableRow>
      <TableCell className="max-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {board ? (
            <a
              href={row.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="admin-row-link truncate"
              title={fill(words.openPosting, { job: jobLabel })}
            >
              {row.title}
            </a>
          ) : (
            <span className="truncate font-semibold">{row.title}</span>
          )}
          {row.priority != null && (
            <span className="shrink-0 font-label text-xs text-warn" title={fill(applications.priority, { n: row.priority })}>
              P{row.priority}
            </span>
          )}
          {!row.active && <span className="shrink-0 text-sm text-muted-foreground">{words.closed}</span>}
        </div>
        <div className="truncate text-sm text-muted-foreground">
          {companyName ?? words.unknownCompany}
          {board && ` · ${board}`}
        </div>
        {place && (
          <div className="truncate text-sm text-muted-foreground" title={place}>
            {place}
          </div>
        )}
        {row.salaryText && (
          <div className="truncate text-sm text-muted-foreground" title={row.salaryText}>
            {row.salaryText}
          </div>
        )}
      </TableCell>

      <TableCell className="font-label" title={words.scoreHint}>
        {score === null ? EMPTY : <span className="text-base text-foreground">{formatNumber(score)}</span>}
        {/* Fit and radar are DIFFERENT scales and may disagree: when both exist, both show. */}
        {hit && (hit.score !== null || hit.rank !== null) && (
          <div className="text-xs text-muted-foreground">
            {hit.score !== null && row.fitScore !== null && fill(words.radarScore, { score: hit.score })}
            {hit.rank !== null && ` ${fill(words.rank, { rank: hit.rank })}`}
          </div>
        )}
      </TableCell>

      <TableCell className={`${LG} max-w-0`}>
        <span className="block truncate">{verdict ?? vocab.verdict.none}</span>
        {hit?.eliminationReason && (
          <span className="block text-sm text-muted-foreground" title={hit.eliminationReason}>
            {fill(words.reason, { reason: hit.eliminationReason })}
          </span>
        )}
        {verification && (
          <span className="block text-sm text-muted-foreground">
            {vocab.verification[verification.verdict as keyof typeof vocab.verification] ?? verification.verdict}{" "}
            {verification.verifiedAt && fill(words.verifiedOn, { date: formatDate(verification.verifiedAt) })}
          </span>
        )}
      </TableCell>

      <TableCell className={`${XL} max-w-0`}>
        <span className="block truncate" title={vocab.visaHint[row.sponsorship]}>
          {vocab.visa[row.sponsorship]}
        </span>
      </TableCell>

      <TableCell className={`${XL} font-label text-xs whitespace-nowrap`}>
        {formatDate(row.postedAt)}
        {hit?.radarScan?.scannedAt && (
          <div className="text-muted-foreground">{fill(words.scannedOn, { date: formatDate(hit.radarScan.scannedAt) })}</div>
        )}
      </TableCell>

      <TableCell className={`${XL} max-w-0`}>
        {application ? (
          <Link href={`/admin/applications/${application.id}`} className="block min-w-0 hover:underline" title={application.folderName}>
            <StageLabel stage={application.stage} words={vocab} />
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">{words.outside}</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="inline-flex items-center gap-1.5">
          {board && (
            <Button asChild variant="ghost" size="icon-sm">
              <a
                href={row.sourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={fill(words.openPosting, { job: jobLabel })}
                title={fill(words.openPosting, { job: jobLabel })}
              >
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          )}
          {!application && <PromoteJobButton jobId={row.id} label={fill(words.promote, { job: jobLabel })} />}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** The header of the table, shared by the loading state and the data. */
function JobsTable({
  params,
  sort,
  labels,
  children,
}: {
  params: Params;
  sort: Sort<JobSortKey>;
  labels: AdminDictionary;
  children: React.ReactNode;
}) {
  const { columns } = labels.jobs;
  const head = (key: JobSortKey, label: string, className: string, first: "asc" | "desc") => (
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
          {head("title", columns.job, "w-auto", "asc")}
          {head("score", columns.score, "w-20 md:w-24", "desc")}
          <TableHead className={`${LG} w-48`}>{columns.verdict}</TableHead>
          <TableHead className={`${XL} w-48`}>{columns.visa}</TableHead>
          {head("posted", columns.posted, `${XL} w-36`, "desc")}
          <TableHead className={`${XL} w-44`}>{columns.funnel}</TableHead>
          <TableHead className="w-24 text-right md:w-28">{columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
