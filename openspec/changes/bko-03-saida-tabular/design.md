## Context

Oito telas de listagem, um board com 21 colunas, um dossiê de 7 abas e um dashboard de agregados. Todos montados sobre os primitives shadcn na F0–F2. Ver proposal.md.

## Goals / Non-Goals

**Goals:** o conteúdo do admin lido como saída de comando, mantendo a semântica que leitores de tela dependem.
**Non-Goals:** comandos digitáveis; mudar consulta, filtro ou paginação no servidor — só a apresentação.

## Decisions

- **A `<table>` semântica fica.** O visual de `ls` poderia ser alcançado com `<pre>` e texto alinhado, e seria mais fiel — mas destruiria cabeçalho de coluna, associação célula↔cabeçalho e navegação por tabela no leitor de tela. Decisão: manter `src/components/ui/table.tsx` como base de DOM e obter o visual por classe (`.admin-listing`), com `border-collapse`, sem raio, sem sombra e larguras em `ch`.
  - Alinhamento monoespaçado só é confiável com largura em `ch` e `tabular-nums`; colunas de largura livre voltam a parecer tabela de painel.

- **Coluna de índice.** Toda listagem ganha uma primeira coluna `001`, `002`… contínua dentro da página, como `ls -1 | nl`. É decorativa (`aria-hidden`), não é o id, e serve de âncora visual no alinhamento.

- **Paginação como linha de status, com `n`/`p`.** `TablePager` passa a renderizar `74 registros · página 1/4   [n]ext  [p]rev`, mantendo os `<button>` reais por trás das etiquetas. Os atalhos só disparam quando o foco não está em campo de texto, e são anunciados na própria linha — atalho que não se vê não existe.

- **`[stage]` em vez de pílula.** `StatusBadge` passa a `[sent]`, com a cor vindo da fase do funil (`pre_send` → `--comment`, `sent` → `--cyan`, `evaluation` → `--yellow`, `outcome` → `--green`/`--red`), reusando `FUNNEL_STAGE_PHASES` de `@/lib/applications` — a mesma fonte que a lista e o board já usam, para não haver um terceiro lugar que decida cor por estágio.

- **Kanban como painéis, com o cabeçalho dizendo a verdade.** Cada coluna vira um painel `stage_name/ (12)` com borda simples; os cards viram duas linhas monoespaçadas (empresa + cargo, depois mercado e patrocínio). A contagem no cabeçalho continua vindo do `groupBy`, não de `cards.length` — a distinção que o `board-data.ts` já documenta, e que o teto de 25 cards por coluna torna visível: o rodapé mostra `… +N` quando há mais.

- **Dashboard com barras em blocos.** Os agregados do funil viram linhas `estágio ████████░░ 12`, com os blocos em `--purple` sobre `--sel`. A barra é `aria-hidden`; o número ao lado é o dado acessível.

- **Abas do dossiê como seletor de colchetes.** As 7 abas viram `[ resumo ] [ linha do tempo ] [ documentos ] …`, ativa em `--purple` com fundo `--sel`. O componente `Tabs` do shadcn continua por baixo — ele já entrega `role="tablist"`, setas do teclado e `aria-selected`, que reescrever à mão custaria caro e quebraria.

## Risks / Trade-offs

- [Larguras em `ch` estouram com nome de empresa longo] → truncar com `text-overflow: ellipsis` na coluna de texto livre e manter o valor completo no `title`; nunca deixar a coluna crescer e desalinhar a tabela.
- [`n`/`p` conflitam com digitação em campo de busca] → só ligar os atalhos quando `document.activeElement` não for campo editável; testar com o filtro da toolbar em foco.
- [21 colunas de Kanban em painel ficam pesadas] → o board já rola horizontalmente; a borda simples pesa menos que o cartão com sombra de hoje.
- [A coluna de índice sugere ordenação estável que a paginação não garante] → é por página e decorativa; o design.md e o componente registram isso.
