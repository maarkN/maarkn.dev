# Spec Delta

## Purpose

Define a lista e a leitura das notas publicadas por Marco.

## ADDED Requirements

### Requirement: Lista de notas
A lista SHALL mostrar as notas da mais recente à mais antiga, com data, tempo de leitura e assuntos.

#### Scenario: CMS indisponível
- **WHEN** o serviço de notas não responde
- **THEN** a lista mostra as notas de reserva, sem erro técnico

#### Scenario: Idioma diferente
- **WHEN** a página está em português e a nota em inglês
- **THEN** o texto da nota é marcado como inglês e a lista avisa

### Requirement: Leitura
A nota SHALL ser legível nos três temas, com títulos, código, citações, listas e imagens, sem rolagem horizontal da página.

#### Scenario: Código largo
- **WHEN** um bloco de código é mais largo que a tela
- **THEN** só o bloco rola na horizontal

#### Scenario: Nota inexistente
- **WHEN** o endereço não corresponde a uma nota
- **THEN** a página responde 404 e oferece a lista
