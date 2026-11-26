# interviews Specification

## Purpose

Define as entrevistas do processo seletivo de uma candidatura, previstas ou marcadas, e como a situação de cada uma evolui.

## Requirements

### Requirement: Entrevista sem data
Uma entrevista SHALL poder existir sem data, como entrevista prevista, com tipo e ordem no processo.

#### Scenario: Processo conhecido de antemão
- **WHEN** o recrutador informa três entrevistas e só a primeira tem data
- **THEN** o dossiê mostra as três em ordem, a primeira marcada e as outras previstas

#### Scenario: Processo desconhecido
- **WHEN** nenhuma entrevista foi registrada
- **THEN** o dossiê informa que não há entrevistas, sem inventar

### Requirement: Situação da entrevista
Toda entrevista SHALL estar em uma situação: prevista, marcada, realizada ou cancelada. Marcada e realizada MUST ter data; prevista MUST NOT ter.

#### Scenario: Marcar uma entrevista prevista
- **WHEN** uma entrevista prevista recebe data e hora
- **THEN** passa a marcada e aparece entre os próximos passos

#### Scenario: Marcar sem data
- **WHEN** se tenta marcar uma entrevista sem data
- **THEN** a alteração é recusada dizendo que falta a data

#### Scenario: Perder a data
- **WHEN** uma entrevista marcada perde a data
- **THEN** volta a prevista e não é excluída

### Requirement: Registro por agente
Agentes autorizados SHALL criar e atualizar entrevistas por uma chave estável, de modo que repetir a chamada MUST NOT criar outra.

#### Scenario: Repetição
- **WHEN** a mesma chamada é feita duas vezes
- **THEN** existe uma entrevista, com os dados da última

#### Scenario: Candidatura inexistente
- **WHEN** a chamada cita uma candidatura que não existe
- **THEN** é recusada e nada é criado

### Requirement: Texto de terceiros é não confiável
Anotações e mensagens de terceiros devolvidas a um agente MUST vir identificadas como conteúdo não confiável.

#### Scenario: Instrução escondida
- **WHEN** a anotação de uma entrevista contém um texto que parece uma ordem ao agente
- **THEN** a leitura o devolve cercado e marcado como não confiável
