# Spec Delta

## Purpose

Guarda o PDF exato que o recrutador recebeu, com acesso restrito ao backoffice e sem alteração depois do envio.

## ADDED Requirements

### Requirement: Anexar documento enviado
Uma candidatura SHALL aceitar currículo e carta em PDF de até 2 MB, com a data de envio.

#### Scenario: Anexo válido
- **WHEN** um PDF de 200 kB é anexado como currículo
- **THEN** o dossiê o lista com nome, tipo, tamanho e data de envio

#### Scenario: Arquivo que não é PDF
- **WHEN** um arquivo com extensão de PDF e conteúdo de outro tipo é anexado
- **THEN** é recusado com a explicação e nada é gravado

#### Scenario: Acima do limite
- **WHEN** o arquivo passa de 2 MB
- **THEN** é recusado dizendo o limite

### Requirement: Imutável depois do envio
Um documento com data de envio MUST NOT ser alterado nem excluído. Anexar outro do mesmo tipo SHALL manter o anterior no histórico.

#### Scenario: Nova versão
- **WHEN** um segundo currículo é anexado à mesma candidatura
- **THEN** o dossiê mostra o mais recente e mantém o anterior consultável

#### Scenario: Tentativa de alterar
- **WHEN** se tenta alterar ou excluir um documento enviado
- **THEN** a operação é recusada

### Requirement: Acesso restrito
O conteúdo do documento MUST ser servido apenas a quem tem sessão no backoffice, sem cache compartilhado e fora de qualquer endereço público.

#### Scenario: Sem sessão
- **WHEN** o endereço do documento é aberto sem sessão
- **THEN** o conteúdo não é entregue

#### Scenario: Com sessão
- **WHEN** Marco abre o documento no backoffice
- **THEN** o PDF é exibido e a resposta proíbe cache compartilhado

### Requirement: Anexo por agente
Um agente autorizado SHALL anexar um documento; anexar o mesmo arquivo duas vezes MUST NOT criar outro. Agentes MUST NOT receber o conteúdo de documentos.

#### Scenario: Repetição
- **WHEN** o mesmo arquivo é anexado de novo à mesma candidatura
- **THEN** existe um documento só

#### Scenario: Leitura por agente
- **WHEN** um agente consulta a candidatura
- **THEN** recebe nome, tipo, tamanho e data, e não o conteúdo
