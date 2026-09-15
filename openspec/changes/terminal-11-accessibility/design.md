## Context

O mockup usa `aria-live` no boot (anunciaria cada caractere), input `opacity:0`, `Tab` capturado e `--comment #7B7F8B` sobre `#282A36` (~4.1:1). Ver proposal.md.

## Goals / Non-Goals

**Goals:** axe 0 violações; operação completa por teclado e leitor de tela.
**Non-Goals:** AAA; modo alto contraste dedicado.

## Decisions

- **Contraste de `comment`**: subir para `#8B8F9C` no tema `soft` (≈4.6:1) e `#6F7FB3` no `classic` (≈4.5:1); registrar em `.docs/design/tokens.md`. Alternativa: manter e restringir a texto grande — rejeitada (comment é usado em texto pequeno em toda parte).
- **Boot**: linhas do typewriter com `aria-hidden`; um `<p class="sr-only" role="status">` com a frase única.
- **Saída**: cada comando gera `<section aria-label="output of X">`; a região `aria-live` é o container. Linhas usam `opacity` na animação, texto já presente.
- **`Esc`** no hook: campo vazio → foco no primeiro `menu-item`; campo com texto → limpa (comportamento de shell).
- **Foco após navegação**: `PageChrome` foca o `<h1 tabIndex=-1>` no `useEffect` de montagem.
- **`--fs` em `rem`** (`0.875rem`/`0.8125rem`), `scroll-behavior: smooth` sob `@media (prefers-reduced-motion: no-preference)`.
- **`<code lang="en">`** em nomes de comandos dentro de strings pt-BR via helper `cmd()` das primitivas.

## Risks / Trade-offs

- [Alterar `comment` muda a fidelidade ao Dracula soft] → diferença imperceptível; documentada.
- [`aria-live` com saídas longas (experience) pode ser verboso] → `aria-relevant="additions"` e blocos por comando; usuário pode interromper com Ctrl.
