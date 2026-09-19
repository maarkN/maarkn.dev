/**
 * Coluna do board — um PAINEL de terminal, não um cartão.
 *
 * Sem `"use client"`: e markup puro (o unico interativo do board e o menu do
 * card). Renderizada por um Server Component, fica no servidor.
 *
 * ── O cabeçalho diz a VERDADE ─────────────────────────────────────────────
 * `stage_name/ (12)`: o nome cru do estágio com a barra de diretório, e entre
 * parênteses a contagem que veio do `groupBy` no banco — NÃO `cards.length`.
 * A distinção é visível: o board corta em `BOARD_CARDS_PER_COLUMN` (25) cards
 * por coluna, então contar o array mentiria assim que uma coluna passasse do
 * teto. O excedente aparece no rodapé como `… +N`.
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
  /** Nome CRU do estágio (`technical_challenge`) — é o que a coluna mostra. */
  name: string;
  /** Rótulo legível, para o `title` e o nome acessível da região. */
  title: string;
  /** Contagem REAL do estagio (do `groupBy`), nao o numero de cards na tela. */
  count: number;
  /** Lista filtrada por este estagio — o "ver tudo" da coluna. */
  href?: string;
  /** Linha extra sob o titulo (a quebra por estagio da coluna agrupada). */
  breakdown?: React.ReactNode;
  /** Cor da fase, em `text-*`: a barra usa `bg-current` para não duplicá-la. */
  accentClassName?: string;
  /** Cards que sobraram alem de `BOARD_CARDS_PER_COLUMN`. */
  hiddenCount?: number;
  children?: React.ReactNode;
}

export function KanbanColumn({
  name,
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
        className="flex w-10 shrink-0 flex-col items-center gap-2 border border-border py-2"
        title={`${title}: nenhuma candidatura`}
      >
        <span className="text-[11px] tabular-nums text-muted-foreground">
          (0)
        </span>
        <span className="whitespace-nowrap text-xs text-muted-foreground [writing-mode:vertical-rl]">
          {name}/
        </span>
      </div>
    );
  }

  return (
    <section
      className="flex w-60 shrink-0 flex-col border border-border"
      aria-label={`${title}: ${count}`}
    >
      <div
        className={cn("h-0.5 w-full bg-current", accentClassName ?? "text-border")}
        aria-hidden
      />
      <header className="space-y-0.5 border-b border-border px-2 py-1.5">
        <div className="flex items-baseline justify-between gap-2">
          {href ? (
            <Link
              href={href}
              className="truncate text-xs transition-colors hover:text-brand"
              title={`Ver “${title}” na lista`}
            >
              {name}/
            </Link>
          ) : (
            <span className="truncate text-xs" title={title}>
              {name}/
            </span>
          )}
          {/* A contagem do `groupBy`, não `cards.length`. */}
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            ({count})
          </span>
        </div>
        {breakdown}
      </header>

      <div className="max-h-[calc(100dvh-24rem)] min-h-16 divide-y divide-border overflow-y-auto">
        {children}
        {hiddenCount > 0 && (
          <p className="px-2 py-1 text-[11px] text-muted-foreground">
            … +{hiddenCount}
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
