# Spec Delta

## ADDED Requirements

### Requirement: Dossiê em painel e em página
O dossiê SHALL abrir em um painel a partir da lista e do quadro, e em página própria pelo endereço, com vaga, empresa, contexto do projeto, entrevistas, documento enviado, histórico, requisitos, triagem, observações e checklist.

#### Scenario: Da lista ao dossiê
- **WHEN** Marco escolhe uma candidatura na lista
- **THEN** o painel abre sem perder filtros e posição

#### Scenario: Endereço inexistente
- **WHEN** o endereço não corresponde a uma candidatura
- **THEN** a página responde 404

#### Scenario: Candidatura recém-criada
- **WHEN** a candidatura ainda não tem nada além da empresa e da vaga
- **THEN** cada parte vazia diz o que falta e como preencher

### Requirement: Texto compartilhado é avisado
Ao editar o texto da empresa, o dossiê SHALL informar em quantas candidaturas ele aparece.

#### Scenario: Empresa com duas candidaturas
- **WHEN** Marco edita o texto da empresa
- **THEN** é avisado de que a mudança vale para as duas

### Requirement: Ver o documento enviado
O dossiê SHALL permitir abrir o documento enviado e consultar os anteriores.

#### Scenario: Antes da entrevista
- **WHEN** Marco abre o currículo enviado
- **THEN** vê o PDF exato que o recrutador recebeu, com a data

#### Scenario: Nada enviado
- **WHEN** nenhum documento foi anexado
- **THEN** o dossiê oferece anexar
