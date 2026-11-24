# Spec Delta

## Purpose

Permite propor mudanças na vitrine pública sem publicá-las, compará-las com o que está no ar e publicar só o que foi revisado.

## ADDED Requirements

### Requirement: Propor sem publicar
Um rascunho SHALL guardar mudanças propostas em um projeto, ou um projeto novo, e MUST NOT aparecer no site, no sitemap, na assistente ou na Versão CLI.

#### Scenario: Rascunho criado por agente
- **WHEN** um agente propõe um novo resumo em português
- **THEN** o site continua com o resumo anterior e existe um rascunho aberto

#### Scenario: Conteúdo inválido
- **WHEN** a proposta traz um link que não é http nem https
- **THEN** é recusada dizendo o campo

### Requirement: Um rascunho por projeto
Cada projeto SHALL ter no máximo um rascunho aberto; uma nova proposta MUST alterar o mesmo rascunho e gerar nova revisão.

#### Scenario: Duas propostas seguidas
- **WHEN** um agente propõe o resumo e depois a função
- **THEN** há um rascunho com as duas mudanças e a revisão é outra

#### Scenario: Projeto inexistente
- **WHEN** a proposta cita um projeto que não existe, sem indicar que é novo
- **THEN** é recusada

### Requirement: Comparar com o que está no ar
Um rascunho SHALL poder ser visto lado a lado com o conteúdo publicado, por campo e por idioma, com a identificação da revisão.

#### Scenario: Mudança em um idioma
- **WHEN** o rascunho altera só o inglês
- **THEN** a comparação destaca o inglês e mostra o português como igual

#### Scenario: Rascunho sem diferença
- **WHEN** o conteúdo proposto é igual ao publicado
- **THEN** a comparação informa que não há o que publicar

### Requirement: Publicar a revisão vista
Publicar MUST exigir a identificação da revisão e MUST recusar se o rascunho, ou o projeto publicado, mudou depois que ela foi mostrada.

#### Scenario: Publicação normal
- **WHEN** a revisão informada é a atual
- **THEN** o site passa a mostrar o conteúdo e o rascunho é encerrado

#### Scenario: Rascunho mudou depois da revisão
- **WHEN** o rascunho foi alterado depois de mostrado
- **THEN** a publicação é recusada pedindo nova revisão

#### Scenario: Projeto mudou no backoffice
- **WHEN** o projeto publicado foi editado depois de o rascunho ser mostrado
- **THEN** a publicação é recusada e a comparação é refeita

### Requirement: Permissão própria para publicar
Publicar por agente MUST exigir uma permissão separada da de propor, desligada por padrão em toda chave.

#### Scenario: Chave do dia a dia
- **WHEN** uma chave que pode propor tenta publicar
- **THEN** é recusada e a tentativa fica na auditoria

### Requirement: Desfazer
A última publicação de um projeto SHALL poder ser desfeita no backoffice, restaurando o conteúdo anterior.

#### Scenario: Desfazer
- **WHEN** Marco desfaz uma publicação
- **THEN** o site volta ao conteúdo anterior e o histórico registra quem publicou e quem desfez

#### Scenario: Nada a desfazer
- **WHEN** o projeto não tem publicação por rascunho
- **THEN** a opção não é oferecida
