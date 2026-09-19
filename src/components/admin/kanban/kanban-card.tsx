"use client";

/**
 * Cartao do board + o menu "mover para".
 *
 * ── Por que menu e nao drag-and-drop ──────────────────────────────────────
 * O prompt admite as duas formas e pede a simples que funciona. DnD aqui
 * custaria: (a) uma dependencia (`@dnd-kit/*` ~40 kB) ou o HTML5 drag nativo,
 * que nao funciona em toque e nao tem equivalente de teclado; (b) estado
 * otimista duplicado no cliente para o card nao "voltar" enquanto a Server
 * Action responde; (c) uma segunda fonte de verdade sobre a ordem das colunas.
 * O funil tem 21 estagios e o board mostra ate 17 colunas com rolagem
 * horizontal — arrastar de "radar" ate "aceita" atravessaria a tela inteira.
 * Um `DropdownMenu` agrupado por fase move para QUALQUER estagio em dois
 * cliques, funciona no teclado e no toque, e a atualizacao vem do
 * `revalidatePath` da action (AGENTS.md §1). Trocar por DnD depois nao muda
 * nada do servidor: a action ja e `moveApplicationStage(id, stage)`.
 */

import { useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, MoveRight } from "lucide-react";
import { toast } from "sonner";
import type { FunnelStage } from "@prisma/client";
import type { ActionResult } from "@/app/_actions/action-result";
import {
  FunnelStageBadge,
  SponsorshipBadge,
} from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FUNNEL_STAGE_LABELS,
  FUNNEL_STAGE_PHASES,
  SPONSORSHIP_HINTS,
} from "@/lib/applications";
import { EMPTY } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KanbanCardData } from "./kanban-types";

export interface KanbanCardProps {
  card: KanbanCardData;
  /**
   * REFERENCIA a uma Server Action (AGENTS.md §6): e serializavel, entao o
   * Server Component que monta o board consegue passa-la para este Client
   * Component. O `id` viaja como prop separada e a composicao acontece aqui.
   */
  moveAction: (id: string, stage: FunnelStage) => Promise<ActionResult>;
  /** Mostra o badge do estagio no card — usado na coluna agrupada. */
  showStage?: boolean;
}

export function KanbanCard({ card, moveAction, showStage }: KanbanCardProps) {
  const [isPending, startTransition] = useTransition();

  const companyName = card.company?.name ?? card.folderName;
  const role = card.roleTitle || card.job?.title || EMPTY;
  // Candidatura manda, vaga completa — mesma heranca de `effectiveSponsorship`
  // / `effectiveMarket`, reescrita aqui porque aquele modulo e `server-only`.
  const sponsorship = card.sponsorship ?? card.job?.sponsorship ?? null;
  const market = card.market ?? card.job?.market ?? null;
  const place = [market, card.job?.locationText].filter(Boolean).join(" · ");

  function move(stage: FunnelStage) {
    startTransition(async () => {
      const result = await moveAction(card.id, stage);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message ?? "Candidatura movida.");
    });
  }

  return (
    <article
      className={cn(
        // `admin-selection`, e não um utilitário de fundo no hover: o realce
        // só é acessível junto com a ida do texto para --fg (ver admin.css).
        "admin-selection space-y-0.5 px-2 py-1.5 transition-opacity",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      {/* Linha 1: empresa — cargo. */}
      <div className="flex items-baseline justify-between gap-1">
        <Link
          href={`/admin/applications/${card.id}`}
          className="min-w-0 flex-1 truncate text-xs transition-colors hover:text-brand"
          title={`${companyName} — ${role}`}
        >
          {companyName}
          <span className="text-muted-foreground"> — {role}</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={isPending}
              aria-label={`Mover ${companyName} para outro estágio`}
              title="Mover para…"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MoveRight className="size-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Mover para…</DropdownMenuLabel>
            {FUNNEL_STAGE_PHASES.map((phase) => (
              <DropdownMenuGroup key={phase.key}>
                <DropdownMenuLabel className="pt-2 text-muted-foreground">
                  {phase.label}
                </DropdownMenuLabel>
                {phase.stages.map((stage) => (
                  <DropdownMenuItem
                    key={stage}
                    disabled={stage === card.stage}
                    onSelect={() => move(stage)}
                  >
                    {stage === card.stage ? (
                      <Check className="size-4" />
                    ) : (
                      <span className="size-4" aria-hidden />
                    )}
                    {FUNNEL_STAGE_LABELS[stage]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Linha 2: mercado e patrocínio (+ o estágio exato na coluna agrupada). */}
      <div className="flex items-baseline gap-2 truncate text-[11px]">
        {showStage && <FunnelStageBadge status={card.stage} />}
        <span
          title={sponsorship ? SPONSORSHIP_HINTS[sponsorship] : undefined}
          className="shrink-0"
        >
          <SponsorshipBadge status={sponsorship} />
        </span>
        <span className="truncate text-muted-foreground" title={place}>
          {place || EMPTY}
        </span>
        {card.priority != null && (
          <span
            className="shrink-0 tabular-nums text-orange"
            title="Prioridade (1 = maior)"
          >
            [P{card.priority}]
          </span>
        )}
      </div>
    </article>
  );
}
