# Spec Delta

## Purpose

Define como o backoffice exibe, filtra e move registros em listas e no quadro de candidaturas.

## ADDED Requirements

### Requirement: Lista semântica
Toda lista SHALL ser uma tabela com cabeçalhos associados, ordenação nas colunas indicadas e linha que abre o registro por ponteiro e por teclado.

#### Scenario: Leitor de tela
- **WHEN** um leitor de tela percorre a lista
- **THEN** anuncia cabeçalhos e a ordenação atual

#### Scenario: Celular
- **WHEN** a lista é aberta em 390 px
- **THEN** mostra as colunas essenciais e nada transborda

### Requirement: Filtros e paginação na URL
Busca, filtros e página SHALL ficar na URL e ser aplicados no servidor.

#### Scenario: Recarregar
- **WHEN** Marco filtra, recarrega ou compartilha o endereço
- **THEN** vê o mesmo resultado

#### Scenario: Página além do fim
- **WHEN** o endereço pede uma página que não existe
- **THEN** a lista mostra a última página

### Requirement: Vazio, carregando e erro
A lista SHALL distinguir "nenhum registro", "nenhum resultado para o filtro", carregando e falha, cada um com a ação seguinte.

#### Scenario: Filtro sem resultado
- **WHEN** o filtro não encontra nada
- **THEN** a lista oferece limpar os filtros

#### Scenario: Banco indisponível
- **WHEN** a leitura falha
- **THEN** a lista informa a falha e não diz que está vazia

### Requirement: Atalhos anunciados
Os atalhos de página SHALL estar escritos na tela e MUST NOT disparar em campo de texto.

#### Scenario: Digitando na busca
- **WHEN** Marco digita a letra do atalho na busca
- **THEN** a letra é inserida e a página não muda

### Requirement: Quadro de candidaturas
O quadro SHALL agrupar as candidaturas abertas em colunas, com a contagem real, e permitir mudar de coluna arrastando ou pelo teclado.

#### Scenario: Arrastar
- **WHEN** uma candidatura é solta em outra coluna
- **THEN** o estágio muda, o histórico registra e há confirmação com desfazer

#### Scenario: Falha ao mover
- **WHEN** o servidor recusa a mudança
- **THEN** a candidatura volta à coluna de origem com a explicação

#### Scenario: Coluna cheia
- **WHEN** a coluna tem mais candidaturas que o teto exibido
- **THEN** mostra a contagem real e quantas faltam

### Requirement: Estágio reconhecível
O estágio SHALL ser mostrado por nome e marca de fase, e MUST NOT depender só da cor.

#### Scenario: Todos os estágios
- **WHEN** os estágios são exibidos
- **THEN** cada um tem nome no idioma da interface e a marca da sua fase
