## Why

Com a base pronta, o site precisa da estrutura em volta das telas: topo, busca, rodapé e as rotas novas. É aqui que a Versão CLI ganha endereço próprio e a home fica livre.

## What Changes

- Topo com marca, páginas, busca, idioma, tema, botão da Versão CLI e contato; entalhe com disponibilidade e hora; rodapé.
- Busca global por `⌘K` ou `Ctrl+K`.
- Transição entre páginas e restauração da rolagem.
- **BREAKING** (URL): o terminal passa de `/[lang]` para `/[lang]/terminal`. `?cmd=` na home redireciona com o mesmo comando.
- A home temporária da branch mostra só a abertura, até `rebrand-03-home`.

**Fora do escopo:** seções da home, páginas internas (continuam com a aparência atual até as changes delas), âncoras e `/chat` (`rebrand-03-home`).

## Capabilities

### New Capabilities
- `site-chrome`: topo, busca, rodapé, idioma e passagem para a Versão CLI.

### Modified Capabilities
- `terminal-home`: novo endereço.
- `terminal-navigation`: links e comandos no novo endereço.
- `terminal-accessibility`: estrutura e auditoria referidas à Versão CLI.

## Impact

- Grupos de rota em `src/app/[lang]`, `src/proxy.ts`, dicionários, `src/lib/terminal/**` (endereços), testes do terminal, `AGENTS.md` do terminal.
- **Branch:** feat/rebranding
- **Depende de:** rebrand-01-foundation
