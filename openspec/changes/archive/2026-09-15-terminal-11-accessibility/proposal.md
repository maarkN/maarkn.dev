## Why

Um site-terminal feito "como o mockup" é hostil a leitores de tela e a quem só usa teclado (Tab capturado, output injetado, contraste de `--comment` abaixo de AA). Esta change é a porta de qualidade de acessibilidade antes do merge final.

## What Changes

- Estrutura semântica (header/nav/main, rótulos, `aria-live` correto) e skip link.
- Boot anunciado como uma única frase; linhas animadas não são lidas caractere a caractere.
- Saída por comando agrupada e nomeada; foco gerenciado após comandos e navegação.
- Saída do foco do prompt com `Esc`; atalhos numéricos só no prompt.
- Correção de contraste de `--comment` (ou restrição de uso) documentada.
- Tamanho de fonte em `rem`, alvos de toque ≥ 44px, `lang` correto em nomes de comando dentro de texto pt-BR.
- Cabeçalhos, breadcrumb e `alt` nas páginas internas.

## Capabilities

### New Capabilities
- `terminal-accessibility`: requisitos de acessibilidade do terminal e das páginas internas (semântica, teclado, leitores de tela, contraste, zoom, toque).

### Modified Capabilities
<!-- nenhuma -->

## Impact

- Componentes em `src/components/terminal/`, `globals.css` (tokens de contraste, `rem`), `page-chrome.tsx`, dicionários (textos sr-only).
- Depende de 06, 07, 10. Resultado documentado em `.docs/design/tokens.md`.
