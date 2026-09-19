# admin-terminal-listing Specification

## Purpose
Define como o backoffice exibe dados tabulares, agrupados e agregados na linguagem do terminal, sem perder a semântica de tabela.

## Requirements

### Requirement: Listagem como saída de comando
Toda listagem do admin SHALL renderizar com coluna de índice decorativa, colunas de largura fixa em `ch` com numerais tabulares, cabeçalho em cor de comentário e realce de linha no hover, sem cartão, raio ou sombra em volta. A marcação MUST permanecer uma `<table>` com `<th scope>`.

#### Scenario: Semântica preservada
- **WHEN** um leitor de tela percorre `/admin/applications`
- **THEN** anuncia a tabela com seus cabeçalhos de coluna, e não anuncia a coluna de índice

#### Scenario: Nome longo
- **WHEN** uma empresa tem nome maior que a coluna
- **THEN** o texto é truncado com reticências, o valor completo fica no `title` e o alinhamento das demais colunas não se altera

### Requirement: Paginação como linha de status
A paginação SHALL ser exibida como uma linha com o total de registros, a página atual, o total de páginas e as ações `[n]ext` e `[p]rev`. As teclas `n` e `p` SHALL acionar essas ações, e MUST NOT disparar quando o foco está em campo editável.

#### Scenario: Atalho com filtro em foco
- **WHEN** o administrador digita `n` dentro do campo de busca
- **THEN** a letra é inserida no campo e a página não muda

#### Scenario: Atalho fora de campo
- **WHEN** o foco está no corpo da listagem e o administrador pressiona `n`
- **THEN** avança uma página, respeitando o limite da última

### Requirement: Estados vazio e de carregamento
Listagem sem resultados SHALL exibir uma linha de comentário em vez de cartão. Carregamento SHALL usar uma linha de progresso que MUST permanecer estática sob `prefers-reduced-motion: reduce`.

#### Scenario: Filtro sem resultado
- **WHEN** um filtro não retorna candidaturas
- **THEN** a tela mostra uma linha de comentário e mantém a toolbar de filtros utilizável

### Requirement: Estágio em notação de colchete
Estágios do funil SHALL ser exibidos como `[nome_do_estagio]`, com a cor derivada da fase (`pre_send`, `sent`, `evaluation`, `outcome`) a partir da mesma fonte usada pela consulta.

#### Scenario: Cobertura dos estágios
- **WHEN** as 21 etiquetas de estágio são renderizadas
- **THEN** cada uma recebe a cor da sua fase e nenhuma cai em cor padrão

### Requirement: Board como painéis por estágio
O Kanban SHALL exibir cada estágio como painel com a contagem real vinda da agregação no banco, cards de duas linhas, e um rodapé `… +N` quando houver mais registros que o teto exibido por coluna.

#### Scenario: Coluna acima do teto
- **WHEN** um estágio tem 30 candidaturas e o teto por coluna é 25
- **THEN** o cabeçalho mostra 30, são exibidos 25 cards e o rodapé mostra `… +5`

### Requirement: Agregados com barra decorativa
Indicadores agregados SHALL exibir uma barra em blocos acompanhada do valor numérico; a barra MUST ser `aria-hidden` e o valor MUST ser legível por leitor de tela.

#### Scenario: Funil no dashboard
- **WHEN** o dashboard é lido por leitor de tela
- **THEN** cada linha anuncia o nome do estágio e o número, sem os caracteres de bloco
