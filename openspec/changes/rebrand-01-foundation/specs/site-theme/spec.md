# Spec Delta

## Purpose

Define os temas de cor e a tipografia do site e do backoffice, e como a preferência de quem visita é escolhida, aplicada e guardada.

## ADDED Requirements

### Requirement: Três temas
O site SHALL oferecer escuro suave, claro suave e Dracula, com a mesma informação e as mesmas ações em todos.

#### Scenario: Troca de tema
- **WHEN** o visitante escolhe outro tema
- **THEN** toda a interface muda sem recarregar, e a escolha vale nas próximas visitas

#### Scenario: Troca sem animação
- **WHEN** o visitante usa movimento reduzido e troca o tema
- **THEN** a troca acontece sem transição

### Requirement: Primeira visita segue o sistema
Sem escolha salva, o site SHALL usar claro suave quando o sistema prefere claro e escuro suave nos demais casos.

#### Scenario: Sistema em modo claro
- **WHEN** alguém abre o site pela primeira vez com o sistema em modo claro
- **THEN** vê o tema claro suave

#### Scenario: Preferência inválida
- **WHEN** o valor salvo não é um tema conhecido
- **THEN** o site usa a preferência do sistema, sem erro

### Requirement: Sem troca visível ao carregar
O tema MUST estar aplicado na primeira pintura.

#### Scenario: Retorno com tema salvo
- **WHEN** um visitante com Dracula salvo recarrega a página
- **THEN** o primeiro quadro já está em Dracula

#### Scenario: Armazenamento bloqueado
- **WHEN** o navegador bloqueia o armazenamento
- **THEN** o site funciona com a preferência do sistema

### Requirement: Preferências independentes
A preferência do site MUST NOT alterar a da Versão CLI, nem o contrário.

#### Scenario: Ida e volta
- **WHEN** o visitante usa claro suave no site, abre a Versão CLI em `classic` e volta
- **THEN** o site continua em claro suave e a Versão CLI em `classic`

### Requirement: Contraste
Todo texto MUST atingir 4.5:1 sobre a superfície em que aparece, ou 3:1 a partir de 18 px em negrito, nos três temas.

#### Scenario: Auditoria
- **WHEN** as telas são auditadas nos três temas
- **THEN** nenhuma violação de contraste é reportada

### Requirement: Tipografia legível
O site SHALL usar fontes proporcionais para títulos e textos, e monoespaçada só para rótulos e dados. As fontes MUST cobrir os acentos do português e MUST NOT mover o conteúdo ao carregar.

#### Scenario: Rede lenta
- **WHEN** as fontes demoram a chegar
- **THEN** o texto já está legível e nada se desloca quando elas chegam
