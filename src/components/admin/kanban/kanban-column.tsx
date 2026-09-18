/**
 * Coluna do board.
 *
 * Sem `"use client"`: e markup puro (o unico interativo do board e o menu do
 * card). Renderizada por um Server Component, fica no servidor.
 *
 * ── A coluna vazia vira uma FAIXA de 40px ─────────────────────────────────
 * O funil tem 21 estagios. Mesmo com os cinco desfechos ruins agrupados, o
 * board mostra 17 colunas, e 17 × 240px = 4080px de rolagem horizontal — a
 * tela que o prompt chama de inutilizavel. A saida e nao gastar largura com
 * coluna vazia: `count === 0` colapsa para uma faixa vertical com o rotulo
 * girado e o zero. O estagio continua VISIVEL (a ordem do funil e a informacao
 * principal do board) e continua sendo destino do menu "mover para" — nao ha
 * drop target para preservar. Na base atual isso deixa ~4 colunas largas e o
 * resto em faixas, tudo numa tela.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

export interface KanbanColumnProps {
  title: string;
  /** Contagem REAL do estagio (do `groupBy`), nao o numero de cards na tela. */
  count: number;
  /** Lista filtrada por este estagio — o "ver tudo" da coluna. */
  href?: string;
  /** Linha extra sob o titulo (a quebra por estagio da coluna agrupada). */
  breakdown?: React.ReactNode;
  /** Barra de cor da fase, para separar os grupos sem depender do rotulo. */
  accentClassName?: string;
  /** Cards que sobraram alem de `BOARD_CARDS_PER_COLUMN`. */
  hiddenCount?: number;
  children?: React.ReactNode;
}

export function KanbanColumn({
  title,
  count,
  href,
  breakdown,
  accentClassName,
  hiddenCount = 0,
  children,
}: KanbanColumnProps) {
  if (count === 0) {
    return (
      <div
        className="flex w-10 shrink-0 flex-col items-center gap-2 bg-muted/30 py-2"
        title={`${title}: nenhuma candidatura`}
      >
        <span className="text-[11px] tabular-nums text-muted-foreground">0</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground [writing-mode:vertical-rl]">
          {title}
        </span>
      </div>
    );
  }

  return (
    <section className="flex w-56 shrink-0 flex-col bg-muted/30" aria-label={title}>
      <div className={cn("h-0.5 w-full", accentClassName ?? "bg-border")} />
      <header className="space-y-0.5 px-2.5 py-2">
        <div className="flex items-baseline justify-between gap-2">
          {href ? (
            <Link
              href={href}
              className="truncate text-xs font-medium transition-colors hover:text-brand"
              title={`Ver “${title}” na lista`}
            >
              {title}
            </Link>
          ) : (
            <span className="truncate text-xs font-medium">{title}</span>
          )}
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {count}
          </span>
        </div>
        {breakdown}
      </header>

      <div className="max-h-[calc(100dvh-24rem)] min-h-16 space-y-2 overflow-y-auto px-2 pb-2">
        {children}
        {hiddenCount > 0 && (
          <p className="px-0.5 pt-1 text-[11px] text-muted-foreground">
            +{hiddenCount} não exibida(s)
            {href && (
              <>
                {" · "}
                <Link href={href} className="underline hover:text-foreground">
                  ver na lista
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
