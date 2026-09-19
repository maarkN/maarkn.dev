/**
 * O eco do comando equivalente nos diálogos de exclusão:
 *
 *     $ rm -rf applications/acme--senior-backend
 *     [y/N]
 *
 * ── Isto é ILUSTRATIVO ─────────────────────────────────────────────────────
 * **Não existe comando por trás.** Nenhum shell é invocado, nenhum caminho de
 * arquivo é tocado, e nenhuma change futura deve tentar "fazer funcionar": o
 * que a tela executa é a Server Action de sempre. A linha existe para dizer,
 * na voz do terminal, o tamanho do estrago — e o `N` maiúsculo do `[y/N]` é a
 * convenção de shell para "o padrão é não", que aqui é verdade literal: o
 * Radix põe o foco inicial no `AlertDialogCancel`.
 *
 * ── O freio real continua sendo a digitação ───────────────────────────────
 * A confirmação forte por digitação do nome exato (AGENTS.md §6) é o que
 * protege contra exclusão acidental. O eco não a substitui, não a enfraquece
 * e não pode ser trocado por ela.
 *
 * O `$` e o `[y/N]` são `aria-hidden`: o comando em si é lido (ele comunica a
 * gravidade), o enfeite do prompt não.
 */

export function DestructiveEcho({ command }: { command: string }) {
  return (
    <p className="font-mono text-xs break-all">
      <span aria-hidden="true" className="text-muted-foreground">
        {"$ "}
      </span>
      <span className="text-destructive">{command}</span>
      <span aria-hidden="true" className="text-muted-foreground">
        {" [y/N]"}
      </span>
    </p>
  );
}
