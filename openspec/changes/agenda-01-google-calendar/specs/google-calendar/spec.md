# Spec Delta

## Purpose

Liga o backoffice ao Google Calendar de Marco para ver compromissos e marcar entrevistas, sem copiar a agenda pessoal.

## ADDED Requirements

### Requirement: Conectar uma conta
O backoffice SHALL permitir conectar e desconectar uma conta Google, e escolher quais calendários exibir. Sem conexão, o restante do backoffice MUST funcionar normalmente.

#### Scenario: Primeira conexão
- **WHEN** Marco conecta a conta e escolhe dois calendários
- **THEN** a semana mostra os compromissos desses dois

#### Scenario: Consentimento recusado
- **WHEN** Marco recusa o acesso na tela do Google
- **THEN** volta às configurações com a explicação e nada fica conectado

#### Scenario: Acesso revogado
- **WHEN** o acesso é revogado pelo Google
- **THEN** o backoffice pede para reconectar e as entrevistas continuam visíveis

### Requirement: Leitura ao vivo
Compromissos SHALL ser lidos do Google no momento da consulta, e compromissos que não são entrevistas MUST NOT ser gravados.

#### Scenario: Mudança no celular
- **WHEN** um compromisso é movido pelo celular e a semana é recarregada
- **THEN** aparece no horário novo

#### Scenario: Google indisponível
- **WHEN** o Google não responde
- **THEN** a semana informa a falha com a opção de tentar de novo, e mostra as entrevistas conhecidas

### Requirement: Escrita só em Entrevistas
O sistema MUST gravar apenas no calendário "Entrevistas", MUST NOT adicionar participantes e MUST NOT disparar convites ou notificações.

#### Scenario: Marcar entrevista
- **WHEN** uma entrevista é marcada
- **THEN** o compromisso aparece em "Entrevistas", sem participantes, e ninguém recebe e-mail

#### Scenario: Tentativa em outro calendário
- **WHEN** se tenta alterar um compromisso de outro calendário
- **THEN** a operação é recusada

### Requirement: Credencial protegida
A credencial de acesso MUST ser guardada cifrada e MUST NOT aparecer em resposta, log ou auditoria.

#### Scenario: Auditoria
- **WHEN** uma chamada usa a integração
- **THEN** o registro não contém a credencial

#### Scenario: Chave de cifra ausente
- **WHEN** a chave de cifra não está configurada
- **THEN** a conexão fica indisponível com a explicação, em vez de guardar em claro

### Requirement: Agenda vista por agentes
Agentes com permissão de leitura SHALL ver compromissos pessoais apenas como "ocupado", com início e fim. Título, descrição, local e participantes MUST ser omitidos, exceto no calendário "Entrevistas".

#### Scenario: Compromisso pessoal
- **WHEN** um agente lista a semana
- **THEN** uma consulta médica aparece como "ocupado"

#### Scenario: Entrevista
- **WHEN** um agente lista a semana
- **THEN** a entrevista aparece com empresa, etapa e horário

#### Scenario: Sem permissão
- **WHEN** uma chave sem `calendar:read` lista a semana
- **THEN** a chamada é recusada
