## Context

O mockup usa `aria-live` no boot (anunciaria cada caractere), input `opacity:0`, `Tab` capturado e `--comment #7B7F8B` sobre `#282A36` (~4.1:1). Ver proposal.md.

## Goals / Non-Goals

**Goals:** axe 0 violações; operação completa por teclado e leitor de tela.
**Non-Goals:** AAA; modo alto contraste dedicado.

## Decisions

- **Contraste de `comment`**: os valores propostos (`#8B8F9C` / `#6F7FB3`) foram remedidos e ficavam em 4.4:1 e 3.6:1; os finais são `#8F93A0` no `soft` (≈4.6:1) e `#8894BB` no `classic` (≈4.75:1, mesmo matiz do Dracula), registrados em `.docs/design/tokens.md`. Alternativa: manter e restringir a texto grande — rejeitada (comment é usado em texto pequeno em toda parte).
- **Boot**: linhas do typewriter e o rótulo de skip com `aria-hidden`; um `<p class="sr-only" role="status">` (`BootAnnouncement`) que recebe a frase única quando o boot passa a `booting` e a perde quando sai dele (uma região viva só anuncia o que muda depois de existir, e remoções não são anunciadas). A região vive no shell, fora do overlay — que `reboot` remonta com `key` — e do `.term` (`aria-hidden`/`inert` durante o boot), então cada `reboot` anuncia a frase de novo; o container do boot deixa de ser `aria-live`.
- **Saída**: o hook agrupa as linhas por execução (`OutputEntry.block`/`label`: o `echo` abre um bloco com o texto digitado, `markDone` o renomeia com o comando resolvido) e `Output` renderiza cada bloco como `<section aria-label="output of X">` dentro do container `aria-live="polite" aria-relevant="additions"`. A saída pré-renderizada (whoami + sitemap) é o bloco `whoami`. A animação de entrada só muda `opacity`/`transform`; o texto está no DOM desde o início.
- **Teclado no prompt**: `Esc` com texto → limpa (comportamento de shell); `Esc` vazio → foco no primeiro item do menu; `Tab` vazio → foco no skip link (nada a completar, e o prompt é o último parável da página — assim "primeiro Tab → skip link" vale mesmo com o prompt focado ao carregar). O skip link da home foca o input por `onClick` (`href="#cmd"` serve sem JS).
- **Foco após navegação**: `route-focus.ts` guarda o último pathname mostrado (terminal e `PageChrome` registram); `PageChrome` foca o `<h1 tabIndex=-1>` só quando o pathname difere do registrado — numa carga direta o foco fica no documento e o primeiro Tab chega ao skip link.
- **Landmarks nas páginas internas**: breadcrumb como `<nav aria-label>` (PS1 `aria-hidden`, comando em `lang="en"`), `<main id="content" tabIndex=-1>`, `cd ..` e a linha de links dentro de um `<footer>` (a linha vira `<nav aria-label="links">`). Na home, a tagline do MOTD é o `<h1>` (peso normal).
- **`--fs` em `rem`** (`0.875rem`/`0.8125rem`) e todos os tamanhos fixos do shell/páginas em `rem`; `scroll-behavior: smooth` sob `@media (prefers-reduced-motion: no-preference)`; barra com 45px (border-box + 1px de borda → botões de 44px) e `min-width: 44px` nos botões, itens do menu com 44px, em ≤ 720px e sob `pointer: coarse`; foco visível com anel interno `--purple` (barra, menu) e `outline` ciano (links).
- **Barra em telas estreitas** (pendência da change 08): em ≤ 720px os botões mostram só o valor (o rótulo fica no nome acessível), `.barPath` tem `flex: 1 1 auto; min-width: 8ch` e o relógio some nas páginas internas.
- **`<code lang="en">`** em nomes de comandos/arquivos dentro de prosa via primitiva `Cmd`; `rich()` renderiza `` `nome` `` com ela, então os dicionários marcam os nomes com crases (`· digite `help``).
- **Admin** (pendência da change 14): bordas dos campos em repouso em `--comment` (≈4.2:1 sobre `--surface-2`), foco continua `--purple`.

## Risks / Trade-offs

- [Alterar `comment` muda a fidelidade ao Dracula soft] → diferença imperceptível; documentada.
- [`aria-live` com saídas longas (experience) pode ser verboso] → `aria-relevant="additions"` e blocos por comando; usuário pode interromper com Ctrl.
- [`aria-relevant="additions"` não anuncia o texto que `ask` reescreve em streaming] → aceito nesta change; só a linha inicial é anunciada.
- [VoiceOver/NVDA não podem ser executados no ambiente de implementação] → verificado pela árvore de acessibilidade do Chrome (landmarks, nomes, regiões, `role=status`), por axe e Lighthouse sobre o app construído e pelos testes em jsdom; a sessão manual com os leitores é a tarefa 3.4, pendência explícita que não bloqueia o arquivamento.
