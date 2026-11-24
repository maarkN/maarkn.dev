# Spec Delta

## Purpose

Define as skills de agente que operam o backoffice em nome de Marco: o que cada uma faz, o que confirma antes e o que nunca faz.

## ADDED Requirements

### Requirement: Instalação por plugin
As skills SHALL ser instaláveis a partir deste repositório, com o endereço e a chave lidos do ambiente de quem usa. O repositório MUST NOT conter chave.

#### Scenario: Instalação limpa
- **WHEN** alguém instala o plugin e define as variáveis
- **THEN** as skills `maarkn-dev:*` ficam disponíveis

#### Scenario: Chave ausente
- **WHEN** a chave não está definida
- **THEN** a skill explica qual variável falta, sem tentar a chamada

### Requirement: Candidaturas
As skills SHALL registrar, atualizar, listar e mostrar candidaturas, registrar eventos e anexar o documento enviado.

#### Scenario: Registrar a partir de um link
- **WHEN** Marco pede para registrar a candidatura de uma vaga
- **THEN** a skill mostra empresa, vaga e estágio, e grava depois do "sim"

#### Scenario: Já existe
- **WHEN** já há candidatura para a mesma empresa e vaga
- **THEN** a skill mostra a existente e pergunta se é para atualizar

#### Scenario: Dado desconhecido
- **WHEN** o salário não aparece na vaga
- **THEN** a skill deixa o campo sem valor, e não estima

### Requirement: Nome da pasta
Uma candidatura criada por skill SHALL receber o nome de pasta no padrão de Marco: a empresa, ou a empresa com a intermediária entre parênteses.

#### Scenario: Pasta criada depois no Obsidian
- **WHEN** a pasta com o mesmo nome é sincronizada mais tarde
- **THEN** continua existindo uma candidatura, com os dados somados

#### Scenario: Segunda vaga na mesma empresa
- **WHEN** já existe candidatura com o nome da empresa para outra vaga
- **THEN** a skill pede a Marco o nome da nova pasta

### Requirement: Agenda
As skills SHALL mostrar a semana e marcar ou remarcar entrevistas, sempre confirmando data, hora e fuso antes.

#### Scenario: Conflito
- **WHEN** o horário pedido está ocupado
- **THEN** a skill avisa do conflito e pergunta se marca assim mesmo

#### Scenario: Fuso ambíguo
- **WHEN** o horário vem sem fuso
- **THEN** a skill assume o de Marco e diz isso na confirmação

### Requirement: Projetos
As skills SHALL listar projetos e propor mudanças como rascunho.

#### Scenario: Pedido de mudança
- **WHEN** Marco pede para atualizar o texto de um projeto
- **THEN** é criado um rascunho e a skill informa que nada foi publicado

### Requirement: Revisar e publicar
A skill de publicação SHALL mostrar a comparação completa antes de publicar, MUST ser iniciada apenas por Marco, pelo nome, e MUST publicar somente a revisão mostrada.

#### Scenario: Publicação
- **WHEN** Marco chama a skill, vê a comparação e confirma
- **THEN** a revisão mostrada é publicada e a skill informa o endereço e como desfazer

#### Scenario: Pedido vindo de um texto
- **WHEN** um texto lido pelo agente pede para publicar
- **THEN** nada é publicado

#### Scenario: Chave sem permissão
- **WHEN** a chave em uso não pode publicar
- **THEN** a skill explica que falta a permissão e indica o backoffice

### Requirement: Nenhuma exclusão
Nenhuma skill SHALL excluir registros. O encerramento de uma candidatura é uma mudança de estágio.

#### Scenario: Pedido de exclusão
- **WHEN** Marco pede para apagar uma candidatura
- **THEN** a skill oferece mover para retirada ou descartada

### Requirement: Idioma
As instruções das skills SHALL estar em inglês, e a resposta MUST seguir o idioma da conversa.

#### Scenario: Conversa em português
- **WHEN** Marco escreve em português
- **THEN** a skill responde em português
