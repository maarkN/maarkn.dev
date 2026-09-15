## Context

O mockup usa um grid `100dvh` (`auto minmax(0,1fr)`) com `body { overflow: hidden }`, menu de 200px e tela rolável. O site atual tem `Nav`/`Footer` e páginas que rolam normalmente; o `overflow: hidden` não pode vazar para as rotas internas. Ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Paridade visual com o mockup em 1440px e 390px (tolerância de 2px).
- Componentes pequenos e sem lógica de comandos, prontos para receber o engine (change 03).

**Non-Goals:**
- Executar comandos, boot, substituir a home.

## Decisions

- **Rota de preview `/[lang]/terminal`** em vez de flag na home: isola risco e permite deploy contínuo. Removida na change 06.
- **Escopo do `overflow: hidden`**: aplicado via classe no `<html>` apenas quando o shell está montado (efeito no client) — simples e reversível; a change 06 substitui por route group com layout próprio.
- **Primitivas React (`<C/> <G/> <P/> <O/> <K/> <Y/> <R/> <D/> <B/>`, `<Row label width>`, `<Bar value>`, `<A href>`)** no lugar das classes globais `.c .g…`: tipadas, tree-shakeable e evitam vazamento de classes de uma letra para o resto do CSS. `<A>` decide `next/link` vs `<a target=_blank rel=noopener>` pelo prefixo da URL (`/` → `Link`; `http(s)://` → nova aba; `mailto:` etc. → `<a>` simples).
- **CSS do shell em CSS Module (`terminal.module.css`)**, não em `globals.css`: o Next não descarrega CSS global entre rotas e as classes do mockup (`.row`, `.line`, `.bar`…) colidiriam com o resto do site. `--fs` fica escopado em `.term` (14px, 13px ≤720px). Só a regra `html.terminal-lock { overflow: hidden }` é global, porque atinge o `<html>`.
- **Menu emite `onCommand(name)`** e recebe `doneSet` por props; não conhece o registry.
- **Saída como lista de `ReactNode`** desde já: `OutputLine = ReactNode | ""` é o que um comando devolve; o shell embrulha cada uma em `OutputEntry { id, line, index, instant?, cmd? }` (`index` = posição no lote impresso, que define o delay de entrada) e `Output` recebe `lines: OutputEntry[]`. Tipos em `src/components/terminal/types.ts` até a change 03 criar `lib/terminal/types.ts`.
- **Sem engine, o shell ecoa**: `Enter` e o menu passam por `requestCommand(name)`, que só imprime `PS1 + comando` (instantâneo, classe `cmd`), marca o item como `done` (exceto `clear`, que limpa a lista). A change 03 substitui esse stub pelo `run` do `use-terminal`.
- **Relógio via `useSyncExternalStore`** com snapshot de servidor `--:--`: sem `setState` em efeito e sem mismatch; o timer dispara no segundo 0 do próximo minuto e depois a cada 60s, com `visibilitychange` para recuperar após throttling.

## Risks / Trade-offs

- [Input invisível pode confundir leitores de tela] → `<label class="sr-only">` associado por `id` (nome acessível vindo de `terminal.prompt.label`); tratamento completo na change 11.
- [`ChatLauncher` do layout `[lang]` sobrepõe o canto inferior direito do terminal na rota de preview] → aceito; a change 06 move o terminal para um route group com layout próprio.
- [`100dvh` em Safari iOS antigos] → browserslist já exige Safari ≥ 16.4, onde `dvh` é suportado.
- [Fontes mono tornam `ch` dependente da fonte ativa; larguras `w12` etc. variam entre caskaydia e daddytime] → aceitável; ambas são monoespaçadas e a diferença é de poucos px.
