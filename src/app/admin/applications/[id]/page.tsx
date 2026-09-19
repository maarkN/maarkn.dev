import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, Pencil, ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import {
  ApplicationSourceBadge,
  FunnelStageBadge,
  SponsorshipBadge,
  VisibilityBadge,
} from "@/components/admin/status-badge";
import { ApplicationDossierTabs } from "@/components/admin/application-detail/dossier-tabs";
import { VerificationBadge } from "@/components/admin/application-detail/detail-badges";
import {
  DetailRow,
  ExternalLinkValue,
  InfoField,
  InternalLinkValue,
  MarkdownBlock,
} from "@/components/admin/application-detail/detail-row";
import { KeyFieldsDialog } from "@/components/admin/application-detail/key-fields-dialog";
import { LogEventDialog } from "@/components/admin/application-detail/log-event-dialog";
import { StageSelect } from "@/components/admin/application-detail/stage-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SPONSORSHIP_HINTS, sourceLabel } from "@/lib/applications";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import {
  EMPTY,
  formatDate,
  formatDateTime,
  toDateInputValue,
} from "@/lib/format";
import {
  logApplicationEvent,
  moveApplicationStage,
  setChecklistItemDone,
  updateApplicationKeyFields,
} from "./actions";
import { getApplicationDossier } from "./dossier";

export const metadata: Metadata = {
  title: "Candidatura · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

/** Guard de sessão + leitura por `params`: esta rota nunca é pré-renderizada. */
export const dynamic = "force-dynamic";

/**
 * Dossiê completo de uma candidatura — a contraparte "página dedicada" do
 * `ApplicationQuickSheet`, na mesma divisão que o admin de referência faz entre
 * `credit-lines.tsx` (Sheet, inspeção rápida) e `user-detail.tsx` (página,
 * dossiê completo).
 *
 * ── Uma consulta, sete abas ────────────────────────────────────────────────
 * Tudo o que a tela mostra sai de UM `findUnique` (`./dossier.ts`). O `<Tabs>`
 * do Radix mantém montado o conteúdo das abas inativas, então uma consulta por
 * aba trocaria um round-trip por sete sem economizar um byte de payload — é
 * N+1 disfarçado de arquitetura.
 *
 * ── Por que NÃO há `<Suspense>`/`loading.tsx` aqui ─────────────────────────
 * A lista streama o corpo dentro de um `<Suspense>`; esta página não pode. O
 * motivo é o `notFound()`: assim que a casca é liberada, a resposta já saiu
 * com status 200 e o Next não consegue mais trocá-lo — um id inexistente
 * renderizaria a tela de 404 com **HTTP 200**, divergindo de
 * `[id]/edit` e de `/admin/generator/[id]`, que devolvem 404 de verdade
 * (verificado). Como aqui é um `findUnique` por chave primária e o resultado
 * decide o status da resposta, a página espera a consulta antes de emitir
 * qualquer byte. Um `loading.tsx` também não serve: o `AdminShell` (a sidebar)
 * é renderizado pela PÁGINA, não por um layout, então o fallback piscaria sem
 * a sidebar — e, por ficar no segmento `[id]`, valeria também para
 * `[id]/edit`, que é de outro dono.
 *
 * ── As escritas chegam por prop ────────────────────────────────────────────
 * `moveApplicationStage`, `logApplicationEvent`, `updateApplicationKeyFields` e
 * `setChecklistItemDone` vivem em `./actions.ts` e são passadas como
 * referência aos Client Components (§6 do `AGENTS.md`: referência de Server
 * Action é serializável). Assim nada em `@/components/admin/application-detail`
 * precisa conhecer o caminho do módulo de ações desta rota.
 */
export default async function ApplicationDetailPage({
  params,
}: PageProps<"/admin/applications/[id]">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const { id } = await params;
  const result = await getApplicationDossier(id);

  // A3: sem DATABASE_URL (ou com a consulta falhando) a página degrada em vez
  // de explodir — e o texto NÃO diz "não encontrada", que seria mentira: a
  // candidatura pode existir e o banco é que não respondeu.
  if (result.status === "unavailable") {
    return (
      <AdminShell email={session.user.email ?? "admin"}>
        <div className="space-y-4">
          <PageHeader
            title="Candidatura"
          />
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              {dbConfigured
                ? "Não foi possível carregar o dossiê desta candidatura."
                : "DATABASE_URL não configurada — o dossiê fica indisponível até o Postgres subir."}
            </CardContent>
          </Card>
        </div>
      </AdminShell>
    );
  }
  if (result.status === "not_found") notFound();

  const app = result.application;
  const company = app.company;
  const job = app.job;
  const companyName = company?.name ?? app.folderName;
  // Herança candidatura > vaga — a mesma regra de `effectiveSponsorship`.
  const sponsorship = app.sponsorship ?? job?.sponsorship ?? null;
  const inheritedSponsorship = app.sponsorship === null && job !== null;
  const market = app.market ?? job?.market ?? null;
  const lastVerification = app.verifications[0] ?? null;

  return (
    <AdminShell email={session.user.email ?? "admin"} name={app.folderName}>
      <div className="space-y-4">
        <PageHeader
          title={companyName}
          description={app.roleTitle || job?.title || "Candidatura"}
          actions={
            <>
              <StageSelect
                id={app.id}
                stage={app.stage}
                action={moveApplicationStage}
              />
              <LogEventDialog
                id={app.id}
                action={logApplicationEvent}
                contacts={app.contacts.map((contact) => ({
                  id: contact.id,
                  name: contact.name,
                }))}
              />
              <KeyFieldsDialog
                id={app.id}
                action={updateApplicationKeyFields}
                inheritedSponsorship={job?.sponsorship ?? null}
                initial={{
                  roleTitle: app.roleTitle,
                  market: app.market,
                  source: app.source,
                  sponsorship: app.sponsorship,
                  priority: app.priority,
                  fit: app.fit,
                  targetSalary: app.targetSalary,
                  // A5: `appliedAt` é data de calendário (meia-noite UTC);
                  // `toDateInputValue` lê em UTC e é o inverso exato do parse.
                  appliedAt: toDateInputValue(app.appliedAt),
                  followUp: app.followUp,
                  outcomeReason: app.outcomeReason,
                  notesMd: app.notesMd,
                }}
              />
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/applications/${app.id}/edit`}>
                  <Pencil className="size-4" />
                  Formulário completo
                </Link>
              </Button>
            </>
          }
        />

        {/* ── cabeçalho do dossiê ───────────────────────────────────────────── */}
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <FunnelStageBadge status={app.stage} />
              <span
                title={sponsorship ? SPONSORSHIP_HINTS[sponsorship] : undefined}
              >
                <SponsorshipBadge status={sponsorship} />
              </span>
              {inheritedSponsorship && (
                <span className="text-[11px] text-muted-foreground">
                  herdado da vaga
                </span>
              )}
              {app.priority != null && (
                <Badge
                  variant="outline"
                  className="tabular-nums"
                  title="Prioridade (1 = maior)"
                >
                  P{app.priority}
                </Badge>
              )}
              {app.source && <ApplicationSourceBadge status={app.source} />}
              <VisibilityBadge status={app.visibility} />
              {company?.ndaProtected && (
                <Badge
                  variant="outline"
                  className="gap-1"
                  title="Empresa sob NDA: o nome real não pode ir para a superfície pública."
                >
                  <ShieldAlert className="size-3" />
                  NDA
                </Badge>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoField
                label="Chave natural"
                value={
                  <span className="font-mono text-xs break-all">
                    {app.folderName}
                  </span>
                }
              />
              <InfoField label="Empresa" value={company?.name} />
              <InfoField label="Cargo" value={app.roleTitle || job?.title} />
              <InfoField label="Mercado" value={market} />

              <InfoField
                label="Local"
                value={
                  [job?.locationText, company?.city, company?.country]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
              />
              <InfoField label="Modalidade" value={job?.workMode} />
              <InfoField label="Contratação" value={job?.employmentType} />
              <InfoField label="Senioridade" value={job?.seniority} />

              <InfoField
                label="Enviada em"
                value={
                  <span className="tabular-nums">{formatDate(app.appliedAt)}</span>
                }
              />
              <InfoField
                label="1ª resposta"
                value={
                  <span className="tabular-nums">
                    {formatDate(app.firstResponseAt)}
                  </span>
                }
              />
              <InfoField
                label="Fechada em"
                value={
                  <span className="tabular-nums">{formatDate(app.closedAt)}</span>
                }
              />
              <InfoField label="Motivo do desfecho" value={app.outcomeReason} />

              <InfoField label="Aderência" value={app.fit} />
              <InfoField label="Follow-up" value={app.followUp} />
              <InfoField label="Salário-alvo" value={app.targetSalary} />
              <InfoField label="Faixa da vaga" value={job?.salaryText} />

              <InfoField label="Origem" value={sourceLabel(app.source)} />
              <InfoField label="Pacote" value={app.packageStatus} />
              <InfoField label="Template de CV" value={app.resumeTemplate?.name} />
              <InfoField
                label="Verificação da vaga"
                value={
                  lastVerification ? (
                    <span className="inline-flex items-center gap-1.5">
                      <VerificationBadge status={lastVerification.verdict} />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatDate(lastVerification.verifiedAt)}
                      </span>
                    </span>
                  ) : undefined
                }
              />
            </div>

            <Separator />

            <div className="grid gap-2 lg:grid-cols-2">
              <DetailRow
                label="Vaga"
                value={
                  job ? (
                    <ExternalLinkValue href={job.sourceUrl} label={job.title} />
                  ) : (
                    "Sem vaga vinculada"
                  )
                }
              />
              <DetailRow
                label="Carreiras"
                value={<ExternalLinkValue href={company?.careersUrl} />}
              />
              <DetailRow
                label="Site"
                value={<ExternalLinkValue href={company?.website} />}
              />
              <DetailRow
                label="LinkedIn"
                value={<ExternalLinkValue href={company?.linkedinUrl} />}
              />
              <DetailRow
                label="Origem no vault"
                value={
                  app.sourcePath ? (
                    <span className="font-mono text-xs break-all">
                      {app.sourcePath}
                    </span>
                  ) : undefined
                }
              />
              <DetailRow
                label="Última escrita"
                value={
                  <span className="text-xs text-muted-foreground">
                    {app.lastMcpTool ?? EMPTY} ·{" "}
                    <span className="tabular-nums">
                      {formatDateTime(app.updatedAt)}
                    </span>
                  </span>
                }
              />
            </div>

            {(app.summaryMd || app.notesMd) && <Separator />}

            {app.summaryMd && (
              <div>
                <h2 className="pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Resumo
                </h2>
                <MarkdownBlock value={app.summaryMd} className="text-foreground" />
              </div>
            )}
            {app.notesMd && (
              <div>
                <h2 className="pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Notas
                </h2>
                <MarkdownBlock value={app.notesMd} className="text-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── contatos: PII, fora das abas de propósito ─────────────────────── */}
        {app.contacts.length > 0 && (
          <Card>
            <CardContent className="space-y-3">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Contatos
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {app.contacts.map((contact) => (
                  <div key={contact.id} className="space-y-1">
                    <div className="text-sm font-medium">{contact.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {contact.roleTitle || EMPTY}
                    </div>
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="block text-xs break-all text-brand hover:underline"
                      >
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <div className="text-xs tabular-nums">{contact.phone}</div>
                    )}
                    {contact.linkedinUrl && (
                      <div className="text-xs">
                        <ExternalLinkValue
                          href={contact.linkedinUrl}
                          label="LinkedIn"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── o dossiê propriamente dito ────────────────────────────────────── */}
        <ApplicationDossierTabs
          documents={app.documents}
          artifacts={app.artifacts}
          events={app.events}
          coverages={app.requirementCoverages}
          questions={app.screeningQuestions}
          honestyNotes={app.honestyNotes}
          interviews={app.interviews}
          checklistItems={app.checklistItems}
          checklistAction={setChecklistItemDone}
        />

        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <ArrowUpRight className="size-3.5" />O banco é canônico: nada editado
          aqui volta para o Obsidian — a sincronização é de mão única.
          <InternalLinkValue
            href="/admin/applications"
            label="Voltar para a lista"
          />
        </p>
      </div>
    </AdminShell>
  );
}
