# Spec Delta

## Purpose

Define como as tecnologias são identificadas por ícone e nome, para reconhecimento rápido por quem não é técnico.

## ADDED Requirements

### Requirement: Ícone com nome
Onde uma tecnologia aparece, o site SHALL mostrar o ícone ao lado do nome quando houver logo. O ícone MUST NOT aparecer sozinho nem ser lido por tecnologia assistiva.

#### Scenario: Tecnologia com logo
- **WHEN** um projeto usa TypeScript
- **THEN** o ícone e o nome aparecem juntos

#### Scenario: Tecnologia sem logo
- **WHEN** uma tecnologia não tem logo
- **THEN** aparece só o nome, alinhado às demais

#### Scenario: Leitor de tela
- **WHEN** a lista de tecnologias é lida
- **THEN** cada nome é anunciado uma vez

### Requirement: Legível nos três temas
Os ícones SHALL usar a cor do texto em que estão.

#### Scenario: Troca de tema
- **WHEN** o visitante troca de tema
- **THEN** todos os ícones mantêm contraste com o fundo

### Requirement: Nome certo
Um ícone MUST corresponder à tecnologia citada, inclusive em nomes compostos.

#### Scenario: Nome composto
- **WHEN** a tecnologia é "PostgreSQL + pgvector"
- **THEN** o ícone é o do PostgreSQL e o nome completo é mantido

#### Scenario: Nome parecido
- **WHEN** a prática citada é "SOLID"
- **THEN** nenhum logo de biblioteca de nome parecido aparece

### Requirement: Sem dependência externa
Os ícones MUST ser servidos pelo próprio site, com origem e licença registradas.

#### Scenario: Serviço de origem fora do ar
- **WHEN** o serviço de onde os logos vieram está fora do ar
- **THEN** o site não muda
