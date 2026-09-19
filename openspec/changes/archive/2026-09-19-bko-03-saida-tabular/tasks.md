## 1. Primitive de listagem

- [x] 1.1 Criar a classe `.admin-listing` (colunas em `ch`, `tabular-nums`, sem raio/sombra, hover `--sel`) e aplicá-la sobre `ui/table.tsx`; verificar que o DOM continua `<table>/<thead>/<th scope>` com axe
- [x] 1.2 Adicionar a coluna de índice `aria-hidden` nas 8 listagens; verificar que o leitor de tela não a anuncia
- [x] 1.3 Reescrever `TablePager` como linha de status com `[n]ext`/`[p]rev` e ligar os atalhos só fora de campo editável; verificar digitando no filtro de `/admin/applications`

## 2. Estados

- [x] 2.1 Estado vazio como `# nenhum registro` e carregamento como linha de progresso; verificar com `prefers-reduced-motion: reduce` que nada pisca
- [x] 2.2 `StatusBadge` em notação de colchete com cor por fase vinda de `FUNNEL_STAGE_PHASES`; verificar que os 21 estágios têm cor e que nenhum caiu no default

## 3. Telas compostas

- [x] 3.1 Kanban como painéis com contagem do `groupBy` e `… +N` no rodapé; verificar que uma coluna com mais de 25 cards mostra o excedente (a base do `seed:demo` NÃO alcança esse caso — `TOTAL_APPLICATIONS = 35` espalhadas por 21 estágios, máximo real de 4 por estágio; a verificação exige concentrar um estágio acima do teto)
- [x] 3.2 Barras em blocos no dashboard, com a barra `aria-hidden` e o número legível; verificar com axe
- [x] 3.3 Abas do dossiê como colchetes sobre o `Tabs` do shadcn; verificar navegação por setas e `aria-selected`

## 4. Verificação

- [x] 4.1 Percorrer as 8 listagens em 1440px e 390px: alinhamento preservado, sem rolagem horizontal do documento, truncamento com `title`
- [x] 4.2 `pnpm lint && env -u DATABASE_URL pnpm build && pnpm test` verdes
