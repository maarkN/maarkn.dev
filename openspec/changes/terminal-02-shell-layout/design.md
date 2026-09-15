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
- **Primitivas React (`<C/> <G/> <P/> <O/> <K/> <Y/> <R/> <D/> <B/>`, `<Row label width>`, `<Bar value>`, `<A href>`)** no lugar das classes globais `.c .g…`: tipadas, tree-shakeable e evitam vazamento de classes de uma letra para o resto do CSS. `<A>` decide `next/link` vs `<a target=_blank rel=noopener>` pelo prefixo da URL.
- **Relógio**: estado inicial `--:--` no SSR, `setInterval` de 1s no client (alinhar ao segundo 0 para poupar CPU). Evita mismatch.
- **Menu emite `onCommand(name)`** e recebe `doneSet` por props; não conhece o registry.
- **Saída como lista de `ReactNode`** desde já (`Output` recebe `lines: OutputLine[]`) para a change 03 não precisar refatorar.

## Risks / Trade-offs

- [Input invisível pode confundir leitores de tela] → `aria-label` e `<label class="sr-only">`; tratamento completo na change 11.
- [`100dvh` em Safari iOS antigos] → browserslist já exige Safari ≥ 16.4, onde `dvh` é suportado.
- [Fontes mono tornam `ch` dependente da fonte ativa; larguras `w12` etc. variam entre caskaydia e daddytime] → aceitável; ambas são monoespaçadas e a diferença é de poucos px.
