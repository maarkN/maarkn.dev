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
import { Badge } from "@/components/ui/badge";
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
        "space-y-2 bg-card p-2.5 ring-1 ring-foreground/10 transition-opacity",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <Link
          href={`/admin/applications/${card.id}`}
          className="min-w-0 flex-1 text-sm font-medium transition-colors hover:text-brand"
          title={card.folderName}
        >
          <span className="line-clamp-2">{companyName}</span>
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
                <DropdownMenuLabel className="pt-2 font-medium text-foreground/70">
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

      <div className="text-xs text-muted-foreground">
        <div className="line-clamp-2">{role}</div>
        {place && <div className="line-clamp-1">{place}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {showStage && (
          <FunnelStageBadge status={card.stage} className="text-[10px]" />
        )}
        <span
          title={sponsorship ? SPONSORSHIP_HINTS[sponsorship] : undefined}
          className="inline-flex"
        >
          <SponsorshipBadge status={sponsorship} className="text-[10px]" />
        </span>
        {card.priority != null && (
          <Badge
            variant="outline"
            className="text-[10px] font-normal tabular-nums"
            title="Prioridade (1 = maior)"
          >
            P{card.priority}
          </Badge>
        )}
      </div>
    </article>
  );
}
