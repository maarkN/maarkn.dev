# Spec Delta

## Purpose

Mostra a semana de Marco ao lado do funil e permite marcar entrevistas sem sair do backoffice.

## ADDED Requirements

### Requirement: Ver a semana
A agenda SHALL mostrar a semana com os compromissos dos calendários escolhidos, a hora atual e a navegação entre semanas, no fuso configurado.

#### Scenario: Compromissos simultâneos
- **WHEN** dois compromissos ocorrem no mesmo horário
- **THEN** os dois são visíveis e legíveis

#### Scenario: Semana vazia
- **WHEN** não há compromissos
- **THEN** a semana aparece vazia, com o convite para marcar

#### Scenario: Celular
- **WHEN** a agenda é aberta em 390 px
- **THEN** mostra um dia por vez, sem rolagem horizontal da página

### Requirement: Marcar pela semana
Escolher um horário livre SHALL abrir o formulário de compromisso, ligado a uma entrevista ou avulso em "Entrevistas".

#### Scenario: Ligar a uma candidatura
- **WHEN** Marco marca um horário e escolhe uma etapa prevista
- **THEN** a etapa passa a marcada, com o compromisso

#### Scenario: Só teclado
- **WHEN** Marco navega pelos horários com o teclado
- **THEN** consegue marcar, abrir e remover

### Requirement: Só leitura no resto
Compromissos fora de "Entrevistas" MUST NOT ser alterados pela agenda.

#### Scenario: Compromisso pessoal
- **WHEN** Marco abre um compromisso pessoal
- **THEN** vê os dados e o caminho para o Google, sem botões de alterar

### Requirement: Estados da conexão
Sem conexão, com acesso revogado ou com o Google fora do ar, a agenda SHALL explicar o que houve e mostrar as entrevistas conhecidas.

#### Scenario: Nunca conectado
- **WHEN** a conta nunca foi conectada
- **THEN** a agenda explica como conectar e lista as entrevistas marcadas
