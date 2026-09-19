"use client";

/**
 * Inspeção RÁPIDA de uma candidatura, a partir da lista — o `Sheet` lateral que
 * o admin de referência usa em `credit-lines.tsx`, ao lado da página dedicada de
 * `user-detail.tsx`.
 *
 * ── Sheet ou página? A distinção, para não haver duas telas iguais ─────────
 * - `Sheet` (aqui): responde "vale a pena abrir isto?" sem tirar o operador da
 *   lista filtrada. Só LEITURA, e só o que a linha da tabela já carregou —
 *   estágio, gate de visto, datas, contadores. Nenhuma escrita, nenhuma
 *   consulta nova.
 * - `/admin/applications/[id]` (página): o dossiê — documentos, timeline,
 *   cobertura de requisitos, triagem, honestidade, entrevistas, checklist — e
 *   todas as ações. É para onde os dois botões do rodapé levam.
 *
 * ── Por que ZERO consulta ──────────────────────────────────────────────────
 * As props são exatamente o payload de `ApplicationListRow`
 * (`src/lib/applications-query.ts`), que o Server Component da lista já
 * carregou para desenhar a tabela. Abrir o Sheet não custa round-trip nenhum, e
 * abrir vinte em sequência continua custando as mesmas duas consultas da
 * página. Um `fetch` no `onOpen` daria o mesmo resultado visual gastando uma
 * consulta por espiada.
 *
 * ── Como plugar na lista ───────────────────────────────────────────────────
 *   <ApplicationQuickSheet application={row}>
 *     <button type="button" className="…">{row.company?.name}</button>
 *   </ApplicationQuickSheet>
 *
 * `children` é o gatilho (`SheetTrigger asChild`), então a própria célula da
 * empresa vira a área clicável da linha. Sem `children`, cai num botão de
 * ícone com rótulo acessível, para usar na coluna de ações.
 */

import Link from "next/link";
import { Eye, FileText, Pencil } from "lucide-react";
import type { FunnelStage, SponsorshipSignal } from "@prisma/client";
import {
  ApplicationSourceBadge,
  FunnelStageBadge,
  SponsorshipBadge,
} from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SPONSORSHIP_HINTS } from "@/lib/applications";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { DetailRow, ExternalLinkValue } from "./detail-row";

/**
 * Estruturalmente igual a `ApplicationListRow`. Declarado aqui, e não importado
 * de `@/lib/applications-query`, porque aquele módulo é `server-only`: um
 * `import type` seria apagado na compilação, mas o ESLint/`server-only` não
 * distingue, e o acoplamento faria este componente quebrar sempre que a lista
 * acrescentasse uma coluna. O TypeScript continua garantindo a compatibilidade
 * no ponto de uso.
 */
export interface ApplicationQuickView {
  id: string;
  folderName: string;
  stage: FunnelStage;
  roleTitle: string | null;
  market: string | null;
  sponsorship: SponsorshipSignal | null;
  source: string | null;
  fit: string | null;
  priority: number | null;
  appliedAt: Date | null;
  firstResponseAt: Date | null;
  targetSalary: string | null;
  followUp: string | null;
  updatedAt: Date;
  company: {
    id: string;
    name: string;
    folderName: string;
    country: string | null;
    city: string | null;
  } | null;
  job: {
    id: string;
    title: string;
    sourceUrl: string;
    market: string | null;
    sponsorship: SponsorshipSignal;
    locationText: string | null;
    workMode: string | null;
  } | null;
  _count: { documents: number; events: number; interviews: number };
}

function joinDot(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

export function ApplicationQuickSheet({
  application,
  children,
}: {
  application: ApplicationQuickView;
  /** Gatilho. Sem ele, um botão de ícone "Inspecionar". */
  children?: React.ReactNode;
}) {
  const row = application;
  const companyName = row.company?.name ?? row.folderName;
  // Herança candidatura > vaga, a mesma regra de `effectiveSponsorship`.
  const sponsorship = row.sponsorship ?? row.job?.sponsorship ?? null;
  const inherited = row.sponsorship === null && row.job !== null;
  const market = row.market ?? row.job?.market ?? null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children ?? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Inspecionar ${companyName}`}
            title="Inspecionar"
          >
            <Eye className="size-4" />
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{companyName}</SheetTitle>
          <SheetDescription>
            {row.roleTitle || row.job?.title || "Candidatura"}
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <FunnelStageBadge status={row.stage} />
            <span
              title={sponsorship ? SPONSORSHIP_HINTS[sponsorship] : undefined}
            >
              <SponsorshipBadge status={sponsorship} />
            </span>
            {inherited && (
              <span className="text-[11px] text-muted-foreground">
                herdado da vaga
              </span>
            )}
            {row.priority != null && (
              <Badge
                variant="outline"
                className="tabular-nums"
                title="Prioridade (1 = maior)"
              >
                P{row.priority}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <DetailRow
              label="Chave"
              value={
                <span className="font-mono text-xs">{row.folderName}</span>
              }
            />
            <DetailRow label="Mercado" value={market} />
            <DetailRow
              label="Local"
              value={joinDot(
                row.job?.locationText,
                row.company?.city,
                row.company?.country,
                row.job?.workMode,
              )}
            />
            <DetailRow
              label="Origem"
              value={
                row.source ? (
                  <ApplicationSourceBadge status={row.source} />
                ) : undefined
              }
            />
            <DetailRow label="Aderência" value={row.fit} />
          </div>

          <Separator />

          <div className="space-y-2">
            <DetailRow
              label="Enviada em"
              value={
                <span className="tabular-nums">{formatDate(row.appliedAt)}</span>
              }
            />
            <DetailRow
              label="1ª resposta"
              value={
                <span className="tabular-nums">
                  {formatDate(row.firstResponseAt)}
                </span>
              }
            />
            <DetailRow label="Follow-up" value={row.followUp} />
            <DetailRow label="Salário-alvo" value={row.targetSalary} />
            <DetailRow
              label="Atualizada em"
              value={
                <span className="tabular-nums">
                  {formatDateTime(row.updatedAt)}
                </span>
              }
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <DetailRow
              label="Documentos"
              value={
                <span className="tabular-nums">
                  {formatNumber(row._count.documents)}
                </span>
              }
            />
            <DetailRow
              label="Eventos"
              value={
                <span className="tabular-nums">
                  {formatNumber(row._count.events)}
                </span>
              }
            />
            <DetailRow
              label="Entrevistas"
              value={
                <span className="tabular-nums">
                  {formatNumber(row._count.interviews)}
                </span>
              }
            />
            <DetailRow
              label="Vaga"
              value={
                <ExternalLinkValue
                  href={row.job?.sourceUrl}
                  label={row.job?.title}
                />
              }
            />
          </div>
        </div>

        <SheetFooter className="flex-row flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/admin/applications/${row.id}`}>
              <FileText className="size-4" />
              [ abrir o dossiê ]
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/applications/${row.id}/edit`}>
              <Pencil className="size-4" />
              [ editar ]
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
