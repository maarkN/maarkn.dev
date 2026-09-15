## Context

O mockup concentra tudo em um IIFE: `CMDS` retorna strings HTML, `print` injeta via `innerHTML`, e `run`/`complete`/`keydown` manipulam o DOM diretamente. Precisamos do mesmo comportamento em React 19 com saída tipada. Ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Núcleo puro e testável sem DOM (`parse`, `complete`, `history`, `registry`).
- Contrato de comando único que sirva para conteúdo (04), boot (05), IA (07), mail (10) e navegação (09).

**Non-Goals:**
- Comandos de conteúdo, boot real, persistência entre páginas (changes 04, 05, 09).

## Decisions

- **Contrato**:
  ```ts
  type OutputLine = ReactNode | "";
  type CommandContext = { locale; dict; theme: ThemeApi; navigate; openExternal; history; clear; reboot; print(line); replaceLast(line) };
  type Command = { name; usage?; describe; hidden?; run(args, ctx): OutputLine[] | null | Promise<OutputLine[] | null> };
  ```
  `print`/`replaceLast` no contexto permitem streaming sem expor o estado React ao comando. Alternativa considerada: comandos como generators — mais elegante, porém pior para abortar e para testes; rejeitada.
- **Registry** com `register(cmd)`, `alias(from, to)`, `resolve(name)`, `list()`; aliases resolvidos antes de `resolve`. O `help` é gerado a partir de `list()` (filtrando `hidden`) para nunca ficar dessincronizado.
- **`""` como linha em branco** (renderiza ` `), replicando o `&nbsp;` do mockup sem HTML.
- **Histórico em memória + espelho em `sessionStorage`** (máx. 100) desde já, para a change 09 só precisar restaurá-lo.
- **Vitest** para os módulos puros; sem testes de componente nesta change (JSDOM entra só se necessário).
- **Modo interativo** (prompt customizado por comando) fica previsto na tipagem (`ctx.ask(promptLabel): Promise<string>`) mas implementado só na change 10.

## Risks / Trade-offs

- [Autocomplete captura `Tab`, prendendo o foco para usuários de teclado] → `Esc` move o foco para o menu (spec e implementação completas na change 11; aqui só não bloquear `Esc`).
- [Comandos assíncronos + `clear` no meio] → `clear` aborta o `AbortController` do comando em execução.
