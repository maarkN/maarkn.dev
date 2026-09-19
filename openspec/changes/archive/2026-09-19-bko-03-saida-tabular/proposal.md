## Why

Com a moldura pronta (change 02), o conteúdo dentro dela ainda é de painel: tabelas em cartão com bordas arredondadas, badges em pílula, paginação em setas, skeletons cinza e um Kanban de colunas com sombra. Uma moldura de terminal em volta de um painel comum fica pior do que qualquer um dos dois puros.

Esta é a change que faz o conteúdo do backoffice parecer saída de comando — e é a que o usuário viu e aprovou no mockup.

## What Changes

- Listagens renderizadas como saída de `ls`: coluna de índice, colunas alinhadas em `ch`, cabeçalho em cor de comentário, sem cartão em volta, realce de linha no hover.
- Paginação como linha de status (`74 registros · página 1/4   [n]ext  [p]rev`), com `n` e `p` no teclado.
- Estado vazio como comentário (`# nenhum registro`), não cartão centralizado.
- Carregamento como linha de progresso, respeitando `prefers-reduced-motion`.
- `StatusBadge` vira notação de colchete (`[sent]`, `[offer]`), colorida pela fase do funil.
- Kanban como painéis por estágio, com contagem real no cabeçalho e `… +N` no rodapé da coluna.
- Abas do dossiê como seletor de colchetes; estatísticas do funil com barras em blocos.

## Capabilities

### New Capabilities
- `admin-terminal-listing`: como dados tabulares, agrupados e agregados são exibidos no backoffice.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/components/admin/{table-pager,status-badge}.tsx`, `src/components/admin/kanban/**`, `src/components/admin/dashboard/**`, `src/components/admin/application-detail/dossier-tabs.tsx`.
- `src/components/ui/{table,badge,tabs,skeleton}.tsx` por estilo.
- As páginas de listagem (`applications`, `jobs`, `contacts`, `projects`, `generator`, `audit`, `chat`, `api-keys`).
- Depende das changes 01 e 02.
