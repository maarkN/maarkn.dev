# Spec Delta

## Purpose

Permite editar os projetos da vitrine nos dois idiomas, ver como ficam e revisar as propostas de agentes antes de publicar.

## ADDED Requirements

### Requirement: Editar com prévia
O editor SHALL permitir alterar todos os campos nos dois idiomas e mostrar, sem salvar, como o projeto aparece na lista e no detalhe.

#### Scenario: Prévia fiel
- **WHEN** Marco altera o resumo em inglês
- **THEN** a prévia em inglês muda na hora e é igual ao que o site mostra depois de salvar

#### Scenario: Sair sem salvar
- **WHEN** Marco sai com alterações não salvas
- **THEN** é perguntado se quer descartá-las

#### Scenario: Link inválido
- **WHEN** o endereço do site não é http nem https
- **THEN** o campo mostra o erro e nada é salvo

### Requirement: Galeria
O editor SHALL permitir enviar, ordenar, legendar e remover imagens.

#### Scenario: Arquivo recusado
- **WHEN** o arquivo não é imagem aceita ou passa do limite
- **THEN** é recusado dizendo o motivo, e as demais imagens continuam

### Requirement: Casos da home
A lista SHALL permitir escolher e ordenar até três casos de sucesso.

#### Scenario: Quarto caso
- **WHEN** Marco marca um quarto caso
- **THEN** é avisado de que precisa desmarcar um

### Requirement: Revisar rascunho
Um projeto com rascunho SHALL mostrar a comparação com o que está no ar, quem propôs e quando, e permitir publicar, descartar e, depois de publicar, desfazer.

#### Scenario: Publicar
- **WHEN** Marco publica o rascunho
- **THEN** o site muda e o aviso traz o endereço e a opção de desfazer

#### Scenario: Mudou enquanto revisava
- **WHEN** o rascunho muda enquanto a comparação está aberta
- **THEN** a publicação é recusada e a comparação é atualizada

#### Scenario: Descartar
- **WHEN** Marco descarta o rascunho
- **THEN** ele some da revisão e fica registrado no histórico
