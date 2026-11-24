# Spec Delta

## Purpose

Define o painel em que o visitante conversa com a assistente sem sair da página.

## ADDED Requirements

### Requirement: Abrir a assistente
A assistente SHALL abrir em um painel a partir de qualquer página do site, com perguntas sugeridas, sem tirar o visitante de onde está.

#### Scenario: Pergunta sugerida
- **WHEN** o visitante escolhe uma pergunta sugerida
- **THEN** a resposta aparece aos poucos e pode ser interrompida

#### Scenario: Fechar
- **WHEN** o visitante fecha o painel
- **THEN** o foco volta ao botão que o abriu

### Requirement: Limites e falhas
O painel SHALL informar quando o limite de mensagens foi atingido ou quando a assistente está indisponível, e oferecer outro canal.

#### Scenario: Limite
- **WHEN** o visitante atinge o limite
- **THEN** vê quando pode voltar a perguntar e o e-mail de contato

#### Scenario: Falha
- **WHEN** a resposta falha no meio
- **THEN** o que já chegou permanece e há opção de tentar de novo

### Requirement: Endereço antigo do chat
`/{lang}/chat` SHALL abrir a home com a assistente aberta.

#### Scenario: Link antigo
- **WHEN** o visitante abre `/en/chat`
- **THEN** vê a home em inglês com o painel aberto

### Requirement: Âncoras antigas
`/#contact`, `/#projects` e `/#about` SHALL levar às seções equivalentes da home.

#### Scenario: Link antigo de contato
- **WHEN** o visitante abre `/en#contact`
- **THEN** a home abre na seção de contato
