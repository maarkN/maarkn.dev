## Why

Os comandos de conteúdo são o coração do portfólio-terminal: são eles que mostram quem é o Marco, a carreira, o stack, os projetos e os textos. O mockup hardcoda esses dados; aqui eles devem vir das fontes que o site já mantém (banco/admin, dicionários, Ghost) para não criar uma segunda verdade.

## What Changes

- Comandos `whoami`, `experience`, `skills`, `projects`, `writing`, `contact`, `cv`, `open <n>`, `read <n>`, `ls`, `cat <file>` e `neofetch`.
- Dados carregados no servidor (`getFeaturedProjects`, `getPosts`) e entregues ao shell como `TerminalData` serializável; timeline, toolkit e site lidos de `lib/`.
- Chave `terminal` completa nos dicionários en/pt-BR (textos de whoami, cabeçalhos, erros, rótulos).
- `site.cvPath` e o PDF do CV em `public/cv/marco-filho.pdf`.
- Links internos via navegação do app (com prefetch), externos em nova aba.

## Capabilities

### New Capabilities
- `terminal-content-commands`: saída, fontes de dados, i18n e tratamento de erro dos comandos de conteúdo do terminal.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/lib/terminal/content-commands.tsx`, `src/lib/terminal/files.ts`, `src/lib/site.ts` (cvPath), `src/app/[lang]/terminal/page.tsx` (carrega dados), dicionários.
- `public/cv/marco-filho.pdf` (copiado de `../resume/`).
- Depende de `terminal-command-engine` (03) e das libs existentes `projects-repo`, `timeline`, `toolkit`, `ghost`, `site`.
