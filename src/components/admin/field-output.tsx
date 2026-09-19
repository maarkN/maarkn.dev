/**
 * As três linhas que cercam um campo do backoffice: ajuda, obrigatoriedade e
 * erro. Um módulo só porque a acessibilidade delas é a parte fácil de errar,
 * e errar uma vez por formulário é errar dezessete vezes.
 *
 * ── O sotaque é decorativo; a semântica não ────────────────────────────────
 * O `#` da ajuda e o `stderr:` do erro são `aria-hidden`. Quem usa leitor de
 * tela ouve "e-mail inválido", não "stderr dois pontos e-mail inválido" — o
 * prefixo é a voz do terminal, não informação. O container do erro carrega
 * `role="alert"` (é inserido no DOM quando a validação falha, então é aí que
 * o anúncio acontece) e um `id` para o campo apontar por `aria-describedby`.
 *
 * ── Rótulo continua texto simples ──────────────────────────────────────────
 * A tentação era escrever os campos como flags (`--company-name`). Em
 * formulário denso isso rouba a varredura do olho e descola o nome acessível
 * do texto visível. Ver `design.md` da change bko-04.
 *
 * ── Obrigatoriedade por extenso, não asterisco ────────────────────────────
 * `(obrigatório)` entra DENTRO do `<label>`: o nome acessível do campo passa a
 * ser "Empresa (obrigatório)", que é exatamente o texto visível. Um `*` solto
 * seria anunciado como "asterisco" ou engolido, dependendo do leitor.
 */

import { cn } from "@/lib/utils";

/**
 * Monta o `aria-describedby` de um campo a partir dos ids que de fato estão
 * na tela. Devolve `undefined` (e não string vazia) quando não há nenhum, para
 * o atributo não ser emitido.
 */
export function describedBy(
  ...ids: (string | false | null | undefined)[]
): string | undefined {
  const present = ids.filter((id): id is string => Boolean(id));
  return present.length > 0 ? present.join(" ") : undefined;
}

/** `# ajuda do campo` — comentário de shell, prefixo decorativo. */
export function FieldHelp({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p id={id} className={cn("text-xs text-muted-foreground", className)}>
      <span aria-hidden="true">{"# "}</span>
      {children}
    </p>
  );
}

/**
 * `stderr: mensagem` — a linha de erro, de campo ou de formulário inteiro.
 * Renderiza `null` sem mensagem, para o call site poder passar o valor cru.
 */
export function FieldError({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn("text-xs text-destructive", className)}
    >
      <span aria-hidden="true">{"stderr: "}</span>
      {children}
    </p>
  );
}

/** `(obrigatório)`, para usar dentro do `<Label>` — nunca um `*` solto. */
export function RequiredHint() {
  return <span className="font-normal text-muted-foreground">(obrigatório)</span>;
}
