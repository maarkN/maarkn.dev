# Spec Delta

## Purpose

Reúne em uma página os canais de contato, para uso em perfis e bios.

## ADDED Requirements

### Requirement: Canais
A página SHALL mostrar e-mail, LinkedIn, GitHub, WhatsApp, CV, Instagram e disponibilidade, sem fotografia.

#### Scenario: Celular
- **WHEN** a página é aberta em 390 px
- **THEN** todos os canais cabem na primeira tela ou na rolagem, com alvos de toque de 44 px

#### Scenario: Indisponível
- **WHEN** Marco se marca como indisponível
- **THEN** a frase de disponibilidade não aparece
