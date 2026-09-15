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
- **Registry** com `register(cmd)`, `alias(from, to)`, `resolve(name)`, `list()`, `names()`; aliases resolvidos antes de `resolve`. O `help` é gerado a partir de `list()`: comandos sem flag entram na tabela, `hidden` entram só na linha `also try:` e `secret` (easter eggs, `cls`, `logout`, o próprio `help`) não aparecem. `describe` é `ReactNode` para permitir o sufixo dim do mockup (`· open <n> reads a case`). Comandos extras (conteúdo, IA, mail) são registrados **antes** dos de sistema para que `help` e o Tab sigam a ordem do mockup (`whoami  writing  whereami`).
- **`run.ts` (`createRunner`)**: o ciclo eco → parse → resolve → executar → imprimir vive em módulo puro com um `RunnerIO` injetado (echo/print/printLine/replaceLast/clear/markDone), para o abort e a saída assíncrona serem testáveis sem DOM. O hook só adapta esse IO ao estado React. `run(raw, base)` recebe o contexto tardio (tema, dicionário, navegação) a cada chamada — evita refs lidas durante o render, que o lint do React Compiler proíbe. Um novo comando aborta o anterior ainda em execução (um por vez, como num shell).
- **Contexto** inclui `commands` (para `help`), `state` (bolsa mutável da sessão, usada pela change 04 em `lastList`) e `signal`; `ask` fica opcional na tipagem até a change 10.
- **Verificação da fonte**: `next/font/local` registra DaddyTimeMono sob um nome de família hasheado, então `document.fonts.check('12px DaddyTimeMono')` nunca falha (não há `@font-face` com esse nome). O comando `font` lê a primeira família de `--font-daddytime`, faz `document.fonts.load()` (timeout 3s) e só então `check()`; a linha `font → DaddyTimeMono` sai imediatamente via `ctx.print` e o aviso laranja, se houver, chega depois.
- **`""` como linha em branco** (renderiza ` `), replicando o `&nbsp;` do mockup sem HTML.
- **Histórico em memória + espelho em `sessionStorage`** (máx. 100) desde já, para a change 09 só precisar restaurá-lo.
- **Vitest** para os módulos puros (`registry`, `parse`, `history`, `complete`, `run`) e um teste de componente do shell em jsdom (`terminal-shell.test.tsx`) cobrindo cada cenário da spec — a implementação correu em paralelo sem browser disponível, e os atalhos de teclado só são verificáveis com DOM. `jsdom` entrou como devDependency.
- **Tab com candidatos** segue o mockup: quando o prefixo comum já está digitado, a primeira pressão de Tab imprime a lista (não há "duplo Tab" como no bash). `Shift+Tab` não é capturado, para manter a navegação de foco por teclado.
- **Modo interativo** (prompt customizado por comando) fica previsto na tipagem (`ctx.ask(promptLabel): Promise<string>`) mas implementado só na change 10.

## Risks / Trade-offs

- [Autocomplete captura `Tab`, prendendo o foco para usuários de teclado] → `Esc` move o foco para o menu (spec e implementação completas na change 11; aqui só não bloquear `Esc`).
- [Comandos assíncronos + `clear` no meio] → `clear` aborta o `AbortController` do comando em execução.
