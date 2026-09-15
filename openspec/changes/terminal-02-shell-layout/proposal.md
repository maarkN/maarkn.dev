## Why

O terminal precisa de uma carcaça visual estável (barra de status estilo tmux, menu de comandos, tela rolável e prompt) antes de qualquer lógica de comandos. Construí-la isolada, em uma rota de preview, permite comparar pixel a pixel com o mockup sem tocar na home atual.

## What Changes

- Novos componentes em `src/components/terminal/` (`terminal-shell`, `status-bar`, `command-menu`, `screen`, `motd`, `prompt`, `output`, `line`, `primitives`).
- Rota de preview `/[lang]/terminal` (removida na change 06 quando a home for trocada).
- Barra de status com `maarkn@dev`, título, botões de paleta/fonte (usando `theme-palette`) e relógio.
- Menu de comandos com atalhos numéricos e estado "já executado".
- Prompt com input invisível e cursor sintético; foco ao clicar na tela.
- Layout responsivo: menu lateral em desktop, faixa horizontal no rodapé no mobile.
- Primitivas React de cor/linha/barra/link substituindo as classes globais `.c .g .p …` do mockup.

## Capabilities

### New Capabilities
- `terminal-shell`: estrutura visual e interativa básica do terminal (barra, menu, tela, prompt, responsividade, foco), sem execução de comandos.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- Novos arquivos em `src/components/terminal/` e `src/app/[lang]/terminal/page.tsx`.
- Novas chaves de dicionário `terminal.bar`, `terminal.menu`, `terminal.motd`, `terminal.hint` em `en.json`/`pt-BR.json`.
- Depende de `theme-palette` (change 01). Nenhuma rota existente é alterada.
