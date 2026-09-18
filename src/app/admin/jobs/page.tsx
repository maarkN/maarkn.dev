import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Info, ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import {
  FunnelStageBadge,
  SponsorshipBadge,
  StatusBadge,
} from "@/components/admin/status-badge";
import {
  TableEmptyRow,
  TableSkeletonRows,
} from "@/components/admin/table-pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SPONSORSHIP_HINTS } from "@/lib/applications";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { EMPTY, formatDate, formatNumber } from "@/lib/format";
import { JobsToolbar } from "./jobs-toolbar";
import { PromoteJobButton } from "./promote-job-button";
import {
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
} from "./jobs-query";
import {
  RADAR_VERDICT_STYLES,
  VERIFICATION_VERDICT_STYLES,
  employmentTypeLabel,
  jobBoard,
  workModeLabel,
} from "./radar";

/**
 * RADAR DE VAGAS.
 *
 * A tela onde uma vaga é julgada ANTES de virar compromisso: pontuação,
 * veredito da varredura, motivo de eliminação, gate de visto, board de origem e
 * data de publicação — e um botão só, o que importa: promover para candidatura.
 *
 * Volume real: ~190 vagas. Filtro e paginação são server-side (`./jobs-query`),
 * nunca `.filter()` no cliente.
 */

// Guard de sessão + searchParams: esta rota nunca é pré-renderizada.
export const dynamic = "force-dynamic";

const COLS = 7;

export default async function JobsPage({
  searchParams,
}: PageProps<"/admin/jobs">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params = await searchParams;
  const filters = parseJobFilters(params);
  const page = parseJobsPage(params.page);
  const [markets, verdicts, unmappedHits] = await Promise.all([
    listJobMarkets(),
    listRadarVerdicts(),
    countUnmappedRadarHits(),
  ]);

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          title="Vagas"
          description="Radar: o que existe lá fora, com pontuação, veredito e o gate de visto — antes de virar candidatura."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/applications">Ver candidaturas</Link>
            </Button>
          }
        />

        <Card>
          <CardContent>
            <JobsToolbar
              {...filters}
              markets={markets}
              verdicts={verdicts}
              page={page}
              position="top"
            />

            <Suspense
              key={jobsQueryKey(filters, page)}
              fallback={
                <JobsTableFrame>
                  <TableSkeletonRows cols={COLS} />
                </JobsTableFrame>
              }
            >
              <JobsRows filters={filters} page={page} />
            </Suspense>
          </CardContent>
        </Card>

        {unmappedHits > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" />
            <span>
              <span className="tabular-nums">{formatNumber(unmappedHits)}</span>{" "}
              linha(s) de varredura ainda não viraram vaga e por isso não
              aparecem aqui. A lista é de <code className="font-mono">Job</code>,
              a entidade com <code className="font-mono">sourceUrl</code>{" "}
              canônico — é ela que a candidatura referencia. Um hit entra na
              tela quando a sincronização gravar a vaga (
              <code className="font-mono">upsert_job</code>).
            </span>
          </p>
        )}
      </div>
    </AdminShell>
  );
}

/* ── Corpo da tabela (suspenso: é o único trecho que espera o banco) ──────── */

async function JobsRows({
  filters,
  page,
}: {
  filters: JobFilters;
  page: number;
}) {
  const result = await listJobs({ filters, page });
  const filtered = hasAnyJobFilter(filters);

  return (
    <>
      <JobsTableFrame>
        {result.failed ? (
          <TableEmptyRow
            cols={COLS}
            destructive
            message={
              dbConfigured
                ? "Não foi possível carregar o radar de vagas."
                : "DATABASE_URL não configurada — a lista fica vazia até o Postgres subir."
            }
          />
        ) : result.rows.length === 0 ? (
          <TableEmptyRow
            cols={COLS}
            message={
              filtered
                ? "Nenhuma vaga corresponde aos filtros."
                : "Nenhuma vaga no radar ainda."
            }
          />
        ) : (
          result.rows.map((row) => <JobRow key={row.id} row={row} />)
        )}
      </JobsTableFrame>

      <JobsToolbar
        {...filters}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        position="bottom"
      />
    </>
  );
}

function JobRow({ row }: { row: JobListRow }) {
  const hit = latestHit(row);
  const verification = latestVerification(row);
  const application = linkedApplication(row);
  const score = effectiveScore(row);
  const board = jobBoard(row.sourceUrl);
  // URI sintético (`demo://…`, e o que o cutover criou para linha de tracker
  // sem link): não é clicável — `jobBoard` devolve `null` justamente nesses.
  const linkable = Boolean(board);
  const companyName = row.company?.name ?? hit?.companyName ?? null;
  const jobLabel = `${row.title}${companyName ? ` — ${companyName}` : ""}`;

  const place = [
    row.market,
    row.locationText,
    workModeLabel(row.workMode),
    employmentTypeLabel(row.employmentType),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <TableRow className={row.active ? undefined : "opacity-60"}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.title}</span>
          {row.priority != null && (
            <Badge
              variant="outline"
              className="text-xs font-normal tabular-nums"
              title="Prioridade (1 = maior)"
            >
              P{row.priority}
            </Badge>
          )}
          {!row.active && (
            <Badge variant="outline" className="text-xs font-normal">
              Encerrada
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {companyName ?? "empresa não identificada"}
          {board && <span className="text-muted-foreground/70"> · {board}</span>}
        </div>
        {place && <div className="text-xs text-muted-foreground">{place}</div>}
        {row.salaryText && (
          <div className="text-xs text-muted-foreground">{row.salaryText}</div>
        )}
      </TableCell>

      <TableCell className="tabular-nums">
        {score === null ? (
          <span className="text-muted-foreground">{EMPTY}</span>
        ) : (
          <span
            className="font-medium"
            title={
              row.fitScore === null
                ? "Pontuação da varredura de radar"
                : "Fit da vaga (Job.fitScore)"
            }
          >
            {formatNumber(score)}
          </span>
        )}
        {/* Fit e radar são escalas DIFERENTES e podem discordar (fit alto com
            veredito eliminado acontece: a régua do radar inclui critério
            eliminatório). Quando as duas existem, as duas aparecem — esconder a
            segunda faria a coluna contradizer a do lado sem explicação. */}
        {hit && (hit.score !== null || hit.rank !== null) && (
          <div className="font-mono text-[11px] text-muted-foreground">
            {hit.score !== null && row.fitScore !== null && `radar ${hit.score}`}
            {hit.rank !== null && ` #${hit.rank}`}
          </div>
        )}
      </TableCell>

      <TableCell>
        {hit?.verdict ? (
          <StatusBadge status={hit.verdict} styles={RADAR_VERDICT_STYLES} />
        ) : (
          <span className="text-xs text-muted-foreground">sem veredito</span>
        )}
        {hit?.eliminationReason && (
          <div className="flex items-start gap-1 pt-0.5 text-[11px] text-muted-foreground">
            <ShieldAlert className="mt-px size-3 shrink-0 text-destructive" />
            <span>{hit.eliminationReason}</span>
          </div>
        )}
        {verification && (
          <div className="pt-1">
            <StatusBadge
              status={verification.verdict}
              styles={VERIFICATION_VERDICT_STYLES}
              className="text-[11px]"
            />
            <span
              className="pl-1 text-[11px] text-muted-foreground"
              title="Verificação da descrição contra a fonte"
            >
              descrição · {formatDate(verification.verifiedAt)}
            </span>
          </div>
        )}
      </TableCell>

      <TableCell>
        <span title={SPONSORSHIP_HINTS[row.sponsorship]}>
          <SponsorshipBadge status={row.sponsorship} />
        </span>
      </TableCell>

      <TableCell className="tabular-nums text-muted-foreground">
        {formatDate(row.postedAt)}
        {hit?.radarScan?.scannedAt && (
          <div className="text-[11px]">
            radar {formatDate(hit.radarScan.scannedAt)}
          </div>
        )}
      </TableCell>

      <TableCell>
        {application ? (
          <Link
            href={`/admin/applications/${application.id}`}
            className="inline-flex flex-col gap-0.5"
            title={application.folderName}
          >
            <FunnelStageBadge status={application.stage} />
            <span className="font-mono text-[11px] text-muted-foreground underline-offset-2 hover:underline">
              {application.folderName}
            </span>
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">
            fora do funil
          </span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="inline-flex items-center gap-1">
          {linkable && (
            <Button asChild variant="ghost" size="icon-sm">
              <a
                href={row.sourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Abrir o anúncio de ${jobLabel}`}
                title="Abrir o anúncio"
              >
                <ExternalLink className="size-4" />
              </a>
            </Button>
          )}
          {!application && (
            <PromoteJobButton jobId={row.id} jobLabel={jobLabel} />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Cabeçalho fixo da tabela — compartilhado pelo skeleton e pelos dados. */
function JobsTableFrame({ children }: { children: React.ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vaga</TableHead>
          <TableHead>Pontuação</TableHead>
          <TableHead>Veredito</TableHead>
          <TableHead>Patrocínio</TableHead>
          <TableHead>Publicada</TableHead>
          <TableHead>Funil</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
