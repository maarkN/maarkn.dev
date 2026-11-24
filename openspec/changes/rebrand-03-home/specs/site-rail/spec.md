# Spec Delta

## Purpose

Define como o visitante descobre as seções da home e navega entre elas, de um jeito que também funciona sem ver a animação.

## ADDED Requirements

### Requirement: Descoberta que só cresce
Uma seção SHALL entrar no trilho quando o visitante passa por ela, e MUST NOT sair ao rolar para cima.

#### Scenario: Rolar de volta
- **WHEN** o visitante chega à quarta seção e volta ao topo
- **THEN** as seções já vistas continuam no trilho

#### Scenario: Seções puladas
- **WHEN** o visitante vai direto à última seção
- **THEN** as anteriores entram no trilho

#### Scenario: Nova sessão
- **WHEN** o visitante fecha o navegador e volta depois
- **THEN** a descoberta recomeça

### Requirement: Sempre alcançável
Todas as seções MUST estar no HTML e ser alcançáveis por teclado e por leitor de tela, descobertas ou não.

#### Scenario: Leitor de tela no início
- **WHEN** um leitor de tela lista os links da home recém-aberta
- **THEN** as oito seções estão lá

#### Scenario: Foco em seção não descoberta
- **WHEN** o foco chega a uma seção ainda não descoberta
- **THEN** ela fica visível

### Requirement: Mostrar todas
O trilho SHALL oferecer revelar todas as seções de uma vez.

#### Scenario: Revelar
- **WHEN** o visitante escolhe mostrar todas
- **THEN** as oito aparecem e a opção some

### Requirement: Ir e voltar
Cada item do trilho SHALL levar à sua seção, inclusive a partir de páginas internas, e a seção atual SHALL estar marcada.

#### Scenario: A partir de um projeto
- **WHEN** o visitante está no detalhe de um projeto e escolhe "O processo"
- **THEN** vai para a home, nessa seção

### Requirement: Celular
Abaixo da largura do trilho, as seções descobertas e as páginas SHALL ficar em um menu na base da tela, que mostra o progresso e a seção atual.

#### Scenario: Abrir o menu
- **WHEN** o visitante toca no menu da base
- **THEN** vê páginas e seções, e pode fechar sem escolher
