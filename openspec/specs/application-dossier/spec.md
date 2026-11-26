# application-dossier Specification

## Purpose

Define o que o dossiê de uma candidatura guarda sobre a vaga, a empresa, o projeto e o desfecho, além do estágio no funil.

## Requirements

### Requirement: Sobre a empresa
O texto sobre a empresa SHALL pertencer à empresa e aparecer em todas as candidaturas feitas nela.

#### Scenario: Duas candidaturas na mesma empresa
- **WHEN** o texto da empresa é alterado em uma candidatura
- **THEN** a outra candidatura da mesma empresa mostra o texto novo

#### Scenario: Empresa sem texto
- **WHEN** nada foi escrito sobre a empresa
- **THEN** o dossiê indica que ainda não há informação, sem esconder a seção

### Requirement: Contexto do projeto
A candidatura SHALL aceitar um texto sobre o produto ou time em que se trabalharia, independente do texto da empresa e da descrição da vaga.

#### Scenario: Vagas diferentes na mesma empresa
- **WHEN** duas candidaturas da mesma empresa têm contextos diferentes
- **THEN** cada dossiê mostra o seu

#### Scenario: Campo omitido pelo agente
- **WHEN** um agente atualiza a candidatura sem informar o contexto do projeto
- **THEN** o contexto existente permanece

### Requirement: Motivo de encerramento
Candidatura recusada ou retirada SHALL aceitar um motivo entre: salário, visto, aderência técnica, senioridade, idioma, local, vaga fechada, candidato interno, desistência, não informado e outro. O texto livre continua disponível.

#### Scenario: Recusa registrada
- **WHEN** uma candidatura é recusada com o motivo "visto"
- **THEN** o dossiê mostra o motivo e o texto livre, e o motivo pode ser somado em relatórios

#### Scenario: Estágio sem motivo
- **WHEN** se tenta registrar motivo em candidatura sem resposta ou com ghosting
- **THEN** o registro é recusado, porque o estágio já diz o que houve

#### Scenario: Candidatura reaberta
- **WHEN** uma candidatura recusada volta para um estágio aberto
- **THEN** o motivo é removido e a mudança fica no histórico

#### Scenario: Candidatura reaberta mais de uma vez
- **WHEN** a mesma candidatura é recusada e reaberta de novo, ainda que no mesmo dia
- **THEN** cada reabertura fica no histórico com o motivo que removeu, e nenhuma substitui a anterior

### Requirement: Descrição da vaga no dossiê
O dossiê SHALL exibir a descrição da vaga associada à candidatura.

#### Scenario: Candidatura sem vaga
- **WHEN** a candidatura não tem vaga associada
- **THEN** o dossiê informa que não há vaga ligada, sem erro

### Requirement: Registro por agente
Agentes autorizados SHALL ler e gravar esses campos, e tudo o que gravarem MUST nascer privado.

#### Scenario: Chave sem escopo
- **WHEN** uma chave só de leitura tenta gravar o contexto do projeto
- **THEN** a chamada é recusada e registrada na auditoria
