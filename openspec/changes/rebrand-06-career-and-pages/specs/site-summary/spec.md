# Spec Delta

## Purpose

Entrega em uma página o essencial para quem tria currículos e tem pouco tempo.

## ADDED Requirements

### Requirement: Resumo em uma página
O resumo SHALL apresentar cargo, senioridade, situação atual, o que procura, formato e destinos, fuso, idiomas, tecnologias, entregas, últimas experiências e casos.

#### Scenario: Leitura rápida
- **WHEN** o recrutador abre `/pt-BR/summary` no desktop
- **THEN** encontra cargo, o que Marco procura e o CV sem rolar

#### Scenario: Indisponível
- **WHEN** Marco se marca como indisponível
- **THEN** o resumo diz isso no lugar do que procura

### Requirement: Copiar e levar
O resumo SHALL poder ser copiado em texto, impresso e acompanhado do CV.

#### Scenario: Copiar
- **WHEN** o recrutador copia o resumo
- **THEN** recebe texto simples, com contatos, no idioma da página

#### Scenario: Cópia bloqueada
- **WHEN** o navegador impede a cópia
- **THEN** é avisado e o texto fica selecionável
