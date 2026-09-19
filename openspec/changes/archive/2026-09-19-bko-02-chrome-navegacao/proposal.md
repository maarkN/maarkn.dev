## Why

Com os tokens unificados (change 01), o admin já tem a cor e a fonte do terminal — mas ainda a moldura de um painel comum: sidebar de 240px com uma lista plana de 14 itens, título de página e breadcrumb convencional. O site abandonou tudo isso na change 08, onde cada página interna passou a se apresentar como o comando que a abriu.

O admin é a única superfície do produto que ainda não fala essa língua.

## What Changes

- Barra de status no topo de toda rota `/admin/**`, mostrando `maarkn@dev`, o caminho (`~/admin/applications`) e o relógio — sem os controles de paleta, fonte e idioma que o site exibe.
- Breadcrumb escrito como comando (`ls applications/`, `cat applications/<pasta>.md`, `tail -f audit.log`), derivado da rota por uma função pura, como `route-chrome.ts` faz no site.
- Link de retorno `cd ..` no rodapé de cada tela, apontando para a listagem correspondente.
- Sidebar reescrita como árvore de diretórios (`tree`), mantendo os ícones numa coluna de largura fixa; entradas ainda não construídas aparecem como comentário `# em breve` em vez de item desabilitado com tooltip.
- `/admin/login` vira uma tela de tty: `maarkn.dev tty1`, `login:`, `password:`.

## Capabilities

### New Capabilities
- `admin-terminal-chrome`: como as telas do backoffice se apresentam dentro da linguagem visual do terminal.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- Novos: `src/components/admin/terminal/{admin-status-bar,admin-chrome,admin-tree-nav}.tsx`, `src/components/admin/terminal/admin-route-chrome.ts`.
- Reescritos: `src/components/admin/admin-shell.tsx`, `src/components/admin/page-header.tsx`, `src/components/admin/login-form.tsx`, `src/app/admin/layout.tsx`.
- Depende da change 01. Bloqueia a change 03 (a listagem assume a coluna do chrome).
