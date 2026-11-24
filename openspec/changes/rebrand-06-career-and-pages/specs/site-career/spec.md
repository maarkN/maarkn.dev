# Spec Delta

## Purpose

Define como o visitante percorre as experiências de Marco, do panorama ao detalhe de cada uma.

## ADDED Requirements

### Requirement: Panorama
A carreira SHALL mostrar todas as experiências em uma linha do tempo, com sobreposições, e em uma lista da mais recente à mais antiga.

#### Scenario: Experiências simultâneas
- **WHEN** duas experiências ocorreram no mesmo período
- **THEN** a linha do tempo mostra as duas sobrepostas

#### Scenario: Leitor de tela
- **WHEN** a página é lida por leitor de tela
- **THEN** cada experiência é anunciada com empresa, cargo e período, sem depender do desenho

### Requirement: Detalhe em janela ou página
Escolher uma experiência SHALL abrir o detalhe em uma janela; abrir o endereço direto SHALL mostrar a página completa, com o mesmo conteúdo.

#### Scenario: Compartilhar
- **WHEN** o visitante copia o endereço com a janela aberta e outra pessoa o abre
- **THEN** ela vê a página completa da experiência

#### Scenario: Voltar
- **WHEN** o visitante usa voltar com a janela aberta
- **THEN** a janela fecha e a lista continua na mesma posição

#### Scenario: Endereço inexistente
- **WHEN** o endereço não corresponde a uma experiência
- **THEN** a página responde 404

### Requirement: Percorrer experiências
Na janela, as setas SHALL levar à experiência anterior ou seguinte.

#### Scenario: Última experiência
- **WHEN** o visitante está na mais antiga e avança
- **THEN** nada acontece e o controle aparece desligado
