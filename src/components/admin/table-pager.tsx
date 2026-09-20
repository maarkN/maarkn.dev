/**
 * Table chrome shared by every backoffice list page: the status line that
 * paginates, the loading row, the empty/error row and the decorative index
 * column.
 *
 * NOTE ON "use client": this module deliberately has no directive.
 * - `TablePager` takes an `onPageChange` callback and binds a keydown
 *   listener, so it can only be rendered from a Client Component — importing
 *   it there pulls it into the client graph automatically. See
 *   `src/app/admin/AGENTS.md` for the canonical "filters + pager in one small
 *   client component" recipe.
 * - `TableLoadingRow` / `TableEmptyRow` / `ListingIndex*` are pure markup and
 *   stay on the server when a Server Component imports them.
 * Adding "use client" here would force all of them into the client bundle for
 * no gain.
 */

import * as React from "react";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ── coluna de índice ─────────────────────────────────────────────────────
 *
 * `001`, `002`… contínuo DENTRO da página, como `ls -1 | nl`. Não é o id e
 * não é estável entre páginas: é âncora visual do alinhamento, e por isso
 * `aria-hidden` — um leitor de tela que anunciasse "001" em cada linha
 * estaria lendo decoração. A largura fica no <th>, que é quem manda sob
 * `table-layout: fixed`.
 */

/** Largura da coluna de índice. Exportada para os `colSpan` não mentirem. */
export const LISTING_INDEX_WIDTH = "w-[7ch]";

export function ListingIndexHead() {
  return <TableHead aria-hidden className={LISTING_INDEX_WIDTH} />;
}

export function ListingIndexCell({ index }: { index: number }) {
  return (
    <TableCell aria-hidden data-listing-index>
      {String(index + 1).padStart(3, "0")}
    </TableCell>
  );
}

/* ── paginação como linha de status ──────────────────────────────────────── */

interface TablePagerProps {
  /** 1-based current page. */
  page: number;
  /** Total number of pages (clamped to >= 1 for display). */
  totalPages: number;
  /** Total record count, shown when available. */
  total?: number;
  onPageChange: (page: number) => void;
  /** Locks both actions — use while a transition is pending. */
  disabled?: boolean;
}

/**
 * `74 registros · página 1/4   [n]ext  [p]rev`
 *
 * As etiquetas são `<button>` de verdade — o colchete é pintura, não um
 * `<span>` com `onClick`. O atalho é anunciado na própria etiqueta porque
 * atalho que não se vê não existe.
 */
export function TablePager({
  page,
  totalPages,
  total,
  onPageChange,
  disabled,
}: TablePagerProps) {
  const lastPage = Math.max(totalPages, 1);
  const canNext = !disabled && page < lastPage;
  const canPrev = !disabled && page > 1;

  useListingShortcut(
    canNext ? () => onPageChange(page + 1) : null,
    canPrev ? () => onPageChange(page - 1) : null,
  );

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {total !== undefined && `${formatNumber(total)} registros · `}
        página {page}/{lastPage}
      </span>
      <span className="flex items-baseline gap-3">
        <PagerAction
          label="[n]ext"
          title="Próxima página (tecla n)"
          accessibleName="Próxima página"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        />
        <PagerAction
          label="[p]rev"
          title="Página anterior (tecla p)"
          accessibleName="Página anterior"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        />
      </span>
    </div>
  );
}

function PagerAction({
  label,
  title,
  accessibleName,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  accessibleName: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      /* O nome acessível COMEÇA pelo rótulo visível e depois explica.
         A bko-03 tinha escrito só a frase ("Próxima página (tecla n)") com o
         argumento de que `[n]ext` é desenho — e isso reprovava a SC 2.5.3
         (Label in Name, nível A): quem comanda por voz diz o que lê na tela,
         e "next" não estava no nome. Apanhado pelo Lighthouse na bko-05
         (`label-content-name-mismatch`). O colchete entra junto porque o
         rótulo visível é `[n]ext` inteiro. */
      aria-label={`${label} — ${accessibleName} (tecla ${label[1]})`}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="text-brand hover:underline disabled:cursor-default disabled:text-comment disabled:no-underline"
    >
      {label}
    </button>
  );
}

/**
 * Liga teclas de uma letra fora de campo editável.
 *
 * O risco é digitar `n` no filtro e trocar de página: o handler está no
 * `document`, então precisa perguntar onde está o foco. `INPUT`, `TEXTAREA`,
 * `SELECT`, `contenteditable` e os papéis ARIA de campo (o `<Select>` do
 * Radix é um `<button role="combobox">`, não um `<select>`) ficam de fora,
 * e qualquer combinação com modificador também — `Ctrl+N` é do navegador.
 */
function useListingShortcut(
  onNext: (() => void) | null,
  onPrev: (() => void) | null,
) {
  // O listener é registrado UMA vez, no `document`; as ações mudam a cada
  // render (a página muda) e chegam até ele por este ref, atualizado num
  // efeito — escrever em ref durante o render é o que `react-hooks/refs`
  // proíbe, e com razão.
  const actions = React.useRef({ onNext, onPrev });
  React.useEffect(() => {
    actions.current = { onNext, onPrev };
  });

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (isEditableTarget(document.activeElement)) return;
      const key = event.key.toLowerCase();
      if (key !== "n" && key !== "p") return;
      // `preventDefault` mesmo com a ação nula: na última página, `n` não
      // avança E não vira caractere em lugar nenhum.
      event.preventDefault();
      const run = key === "n" ? actions.current.onNext : actions.current.onPrev;
      run?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const EDITABLE_ROLES = new Set([
  "textbox",
  "searchbox",
  "combobox",
  "spinbutton",
  "listbox",
  "menu",
  "menuitem",
  "option",
]);

/** Exportado para o teste: é a regra inteira do atalho. */
export function isEditableTarget(element: Element | null): boolean {
  if (!element) return false;
  if (EDITABLE_TAGS.has(element.tagName)) return true;
  const role = element.getAttribute("role");
  if (role && EDITABLE_ROLES.has(role)) return true;
  // `isContentEditable` pega o caso herdado (um filho dentro da caixa
  // editável); o atributo pega o caso direto — e é o único dos dois que o
  // jsdom implementa, por isso os dois estão aqui.
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  const editable = element.getAttribute("contenteditable");
  return editable !== null && editable !== "false";
}

/* ── estados ─────────────────────────────────────────────────────────────── */

/**
 * Carregando: uma linha de progresso, não seis retângulos cinza.
 *
 * Os blocos são desenhados inteiros e revelados por um `clip-path` animado
 * (`.admin-progress`), então sob `prefers-reduced-motion: reduce` a regra
 * global de globals.css encerra a animação no último quadro — barra cheia,
 * parada. O texto "carregando" é o que o leitor de tela recebe; os blocos são
 * `aria-hidden`.
 */
export function TableLoadingRow({ cols }: { cols: number }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={cols} className="py-3 text-muted-foreground">
        <span role="status" className="flex items-center gap-2">
          <span aria-hidden>#</span>
          carregando
          <span className="admin-progress" aria-hidden>
            {"█".repeat(24)}
          </span>
        </span>
      </TableCell>
    </TableRow>
  );
}

/**
 * Vazio / erro: uma linha de comentário, como um shell que não achou nada.
 * O `#` é decoração — o leitor de tela recebe a frase, não o sinal.
 */
export function TableEmptyRow({
  cols,
  message = "nenhum registro",
  destructive,
}: {
  cols: number;
  message?: string;
  destructive?: boolean;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={cols}
        className={cn(
          "py-6 whitespace-normal",
          destructive ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <span aria-hidden>{"# "}</span>
        {message}
      </TableCell>
    </TableRow>
  );
}
