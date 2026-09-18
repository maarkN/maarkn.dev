/**
 * Primitivos de leitura do dossiê de candidatura.
 *
 * Portados do admin de referência (`credit-lines.tsx` → `DetailRow`, `user-detail.tsx` →
 * `InfoField`), com o mesmo grid `grid-cols-[9rem_1fr] gap-2 text-sm` — a
 * medida existe para que rótulo e valor fiquem alinhados entre blocos
 * diferentes da mesma tela, inclusive dentro do Sheet estreito.
 *
 * Quando usar cada um:
 * - `DetailRow`: rótulo à ESQUERDA do valor. É o formato de leitura vertical
 *   (Sheet lateral, coluna de metadados). Cabe em 20rem sem quebrar.
 * - `InfoField`: rótulo ACIMA do valor. É o formato de grade (cabeçalho da
 *   página dedicada, 2–4 colunas), onde a coluna fixa de 9rem desperdiçaria
 *   metade da largura.
 *
 * Nenhum deles tem `"use client"`: são markup puro, então servem tanto ao
 * Server Component da página quanto ao Client Component do Sheet — o módulo
 * entra no grafo de quem importa.
 *
 * Todo valor vazio (`null`, `undefined` **e string vazia**) vira `EMPTY` (—).
 * O `??` sozinho não cobre `""`, que é o que sai de um `<input>` em branco
 * salvo sem normalização; por isso `orEmpty` existe em vez de um `?? EMPTY`
 * espalhado por cinquenta chamadas.
 */

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { EMPTY } from "@/lib/format";
import { cn } from "@/lib/utils";

function orEmpty(value: React.ReactNode): React.ReactNode {
  if (value === null || value === undefined || value === "") return EMPTY;
  return value;
}

export function DetailRow({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-[9rem_1fr] gap-2 text-sm", className)}>
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0 break-words">{orEmpty(value)}</div>
    </div>
  );
}

export function InfoField({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="min-w-0 text-sm break-words">{orEmpty(value)}</div>
    </div>
  );
}

/**
 * Bloco de markdown do vault (`notesMd`, `summaryMd`, `bodyMd`, `evidenceMd`…).
 *
 * NÃO renderiza markdown: o projeto não tem renderer instalado e o conteúdo é
 * do vault, não do usuário final — proposital. `whitespace-pre-wrap` preserva
 * as quebras de linha, que é o que torna a prosa legível, sem abrir a porta de
 * `dangerouslySetInnerHTML` num texto que a sincronização MCP escreve.
 */
export function MarkdownBlock({
  value,
  className,
  clamp,
}: {
  value?: string | null;
  className?: string;
  /** Corta em 3 linhas — para prévia dentro de célula de tabela. */
  clamp?: boolean;
}) {
  if (!value) return null;
  return (
    <p
      className={cn(
        "whitespace-pre-wrap text-sm break-words text-muted-foreground",
        clamp && "line-clamp-3",
        className,
      )}
    >
      {value}
    </p>
  );
}

/** Estado vazio de um bloco que não é tabela (o da tabela é `TableEmptyRow`). */
export function EmptyBlock({ message }: { message: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>
  );
}

/**
 * Valor que é um link externo (vaga, página de carreiras, LinkedIn).
 *
 * Só vira `<a>` quando o esquema é http(s). Dois motivos, e o segundo é o que
 * importa: o cutover do F2a gravou URIs sintéticos (`legacy://job/…`) nas vagas
 * do tracker antigo, que não são navegáveis; e um `href` de esquema arbitrário
 * vindo do banco é superfície de `javascript:`. Fora da allowlist, cai para o
 * `label` (ou para o próprio valor) renderizado como TEXTO — o título da vaga
 * continua legível, só perde o clique.
 */
export function ExternalLinkValue({
  href,
  label,
}: {
  href?: string | null;
  label?: string;
}) {
  if (!href || !/^https?:\/\//i.test(href)) return <>{orEmpty(label ?? href)}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 break-all text-brand hover:underline"
    >
      {label ?? href}
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  );
}

/** Link interno do backoffice, com o mesmo tratamento visual. */
export function InternalLinkValue({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href} className="text-brand hover:underline">
      {label}
    </Link>
  );
}
