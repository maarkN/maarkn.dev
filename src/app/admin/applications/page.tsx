import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ExternalLink, Pencil, Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteApplicationButton } from "@/components/admin/delete-application-button";
import { PageHeader } from "@/components/admin/page-header";
import {
  ApplicationSourceBadge,
  FunnelStageBadge,
  SponsorshipBadge,
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
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { EMPTY, formatDate } from "@/lib/format";
import { SPONSORSHIP_HINTS } from "@/lib/applications";
import {
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
} from "@/lib/applications-query";
import { ApplicationsToolbar } from "./applications-toolbar";

// Guard de sessão + searchParams: esta rota nunca é pré-renderizada.
export const dynamic = "force-dynamic";

const COLS = 6;

export default async function ApplicationsPage({
  searchParams,
}: PageProps<"/admin/applications">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params = await searchParams;
  const filters = parseApplicationFilters(params);
  const page = parsePage(params.page);
  const [markets, sources] = await Promise.all([
    listApplicationMarkets(),
    listApplicationSources(),
  ]);

  // As actions redirecionam com ?created= / ?updated= — como elas redirecionam,
  // não há retorno para o cliente e portanto não há toast (§2 do AGENTS.md).
  // Texto vindo da URL: só é renderizado como texto (React escapa), e o corte
  // evita que uma URL forjada estique o aviso indefinidamente.
  const created = one(params.created).slice(0, 160);
  const updated = one(params.updated).slice(0, 160);
  const notice = created
    ? `Candidatura “${created}” criada.`
    : updated
      ? `Candidatura “${updated}” atualizada.`
      : null;

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          title="Candidaturas"
          description="Funil completo — estágio, mercado e o gate de visto separado por rota."
          actions={
            <Button asChild size="sm">
              <Link href="/admin/applications/new">
                <Plus className="size-4" />
                Nova candidatura
              </Link>
            </Button>
          }
        />

        {notice && (
          <Card>
            <CardContent className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-500" />
              {notice}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <ApplicationsToolbar
              {...filters}
              markets={markets}
              sources={sources}
              page={page}
              position="top"
            />

            <Suspense
              key={applicationsQueryKey(filters, page)}
              fallback={
                <ApplicationsTableFrame>
                  <TableSkeletonRows cols={COLS} />
                </ApplicationsTableFrame>
              }
            >
              <ApplicationsRows filters={filters} page={page} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

/* ── Corpo da tabela (suspenso: é o único trecho que espera o banco) ──────── */

async function ApplicationsRows({
  filters,
  page,
}: {
  filters: ApplicationFilters;
  page: number;
}) {
  const result = await listApplications({ filters, page });
  const filtered = hasAnyApplicationFilter(filters);

  return (
    <>
      <ApplicationsTableFrame>
        {result.failed ? (
          <TableEmptyRow
            cols={COLS}
            destructive
            message={
              dbConfigured
                ? "Não foi possível carregar as candidaturas."
                : "DATABASE_URL não configurada — a lista fica vazia até o Postgres subir."
            }
          />
        ) : result.rows.length === 0 ? (
          <TableEmptyRow
            cols={COLS}
            message={
              filtered
                ? "Nenhuma candidatura corresponde aos filtros."
                : "Nenhuma candidatura registrada ainda."
            }
          />
        ) : (
          result.rows.map((row) => {
            const sponsorship = effectiveSponsorship(row);
            const market = effectiveMarket(row);
            const companyName = row.company?.name ?? row.folderName;
            const jobUrl = row.job?.sourceUrl;
            // URI sintético criado pelo cutover para as linhas do tracker antigo
            // que não tinham link algum: não é clicável.
            const linkable = Boolean(jobUrl && /^https?:\/\//i.test(jobUrl));
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{companyName}</span>
                    {row.fit && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.fit}
                      </span>
                    )}
                    {row.priority != null && (
                      <Badge
                        variant="outline"
                        className="text-xs font-normal tabular-nums"
                        title="Prioridade (1 = maior)"
                      >
                        P{row.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {row.folderName}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div>{row.roleTitle || row.job?.title || EMPTY}</div>
                  <div className="text-xs">
                    {[market, row.job?.locationText].filter(Boolean).join(" · ") ||
                      EMPTY}
                  </div>
                </TableCell>
                <TableCell>
                  <FunnelStageBadge status={row.stage} />
                </TableCell>
                <TableCell>
                  <span
                    title={
                      sponsorship ? SPONSORSHIP_HINTS[sponsorship] : undefined
                    }
                  >
                    <SponsorshipBadge status={sponsorship} />
                  </span>
                  {row.sponsorship === null && row.job && (
                    <div className="pt-0.5 text-[11px] text-muted-foreground">
                      herdado da vaga
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <ApplicationSourceBadge status={row.source} />
                  <div className="pt-0.5 text-xs tabular-nums text-muted-foreground">
                    {formatDate(row.appliedAt)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    {linkable && (
                      <Button asChild variant="ghost" size="icon-sm">
                        <a
                          href={jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Abrir a vaga de ${companyName}`}
                          title="Abrir a vaga"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link
                        href={`/admin/applications/${row.id}/edit`}
                        aria-label={`Editar ${companyName}`}
                        title="Editar"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <DeleteApplicationButton
                      id={row.id}
                      company={companyName}
                      folderName={row.folderName}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </ApplicationsTableFrame>

      <ApplicationsToolbar
        {...filters}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        position="bottom"
      />
    </>
  );
}

/** Cabeçalho fixo da tabela — compartilhado pelo skeleton e pelos dados. */
function ApplicationsTableFrame({ children }: { children: React.ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empresa</TableHead>
          <TableHead>Vaga</TableHead>
          <TableHead>Estágio</TableHead>
          <TableHead>Patrocínio</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}
