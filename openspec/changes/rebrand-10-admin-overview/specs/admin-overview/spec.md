# Spec Delta

## Purpose

Mostra a Marco o que espera por ele, o que vem na semana e se as candidaturas estão tendo resposta.

## ADDED Requirements

### Requirement: Números principais
A visão geral SHALL mostrar vagas a triar, candidaturas prontas, enviadas, entrevistas da semana e a taxa de resposta, cada número levando à lista correspondente.

#### Scenario: Sem envios
- **WHEN** nenhuma candidatura foi enviada no período
- **THEN** a taxa aparece como "—", e não como 0%

#### Scenario: Ir à lista
- **WHEN** Marco escolhe "Prontas"
- **THEN** vê a lista já filtrada

### Requirement: Filtros valem para tudo
Período e rota SHALL afetar todos os números, gráficos e listas da tela.

#### Scenario: Rota remota
- **WHEN** Marco filtra a rota remota
- **THEN** todos os números consideram só candidaturas remotas

#### Scenario: Banco indisponível
- **WHEN** a leitura falha
- **THEN** cada seção informa a falha, e nenhuma mostra zero

### Requirement: Gráficos legíveis
Todo gráfico SHALL ter título, valores consultáveis por ponteiro e por teclado e uma tabela equivalente, e MUST NOT depender só de cor.

#### Scenario: Tabela
- **WHEN** Marco pede a tabela de envios e respostas
- **THEN** vê os mesmos valores do gráfico

#### Scenario: Período sem dados
- **WHEN** não há dados no período
- **THEN** o gráfico diz isso, em vez de um eixo vazio

### Requirement: Alcance honesto
O alcance por estágio SHALL contar só o que tem evidência, e a conversão sem base MUST aparecer como "—".

#### Scenario: Candidatura descartada sem envio
- **WHEN** uma candidatura foi descartada sem ter sido enviada
- **THEN** não conta como enviada

### Requirement: Precisa de você hoje
A tela SHALL listar o que depende de Marco, com o caminho para resolver.

#### Scenario: Compromisso pendente
- **WHEN** uma entrevista foi marcada e o compromisso não pôde ser criado
- **THEN** aparece na lista, com a opção de tentar de novo

#### Scenario: Nada pendente
- **WHEN** não há pendências
- **THEN** a lista diz que está tudo em dia

### Requirement: Próximos passos
Um painel SHALL mostrar a agenda de entrevistas, as cobranças e os acontecimentos recentes, e cada item SHALL abrir o dossiê.

#### Scenario: Google desconectado
- **WHEN** o Google não está conectado
- **THEN** as entrevistas conhecidas aparecem e há o caminho para conectar
