# Spec Delta

## Purpose

Define como se reconhece e como responde tudo o que é interativo, para que qualquer pessoa saiba onde pode clicar.

## ADDED Requirements

### Requirement: Só o interativo é holograma
Elementos interativos SHALL ter o tratamento de holograma, e elementos não interativos MUST NOT tê-lo. Links dentro de texto corrido usam o feixe.

#### Scenario: Número em destaque
- **WHEN** uma tela mostra uma métrica que não é clicável
- **THEN** ela aparece sem moldura

#### Scenario: Card clicável
- **WHEN** um card leva a outra tela
- **THEN** tem moldura e responde ao ponteiro, ao toque e ao teclado

### Requirement: Moldura assimétrica
A moldura SHALL ser um retângulo com três cantos cortados de formas diferentes e o inferior esquerdo inteiro, com linhas internas paralelas às externas.

#### Scenario: Paralelismo
- **WHEN** a moldura é medida em qualquer tamanho
- **THEN** cada linha interna é paralela à externa correspondente

#### Scenario: Mesma peça
- **WHEN** o mesmo botão é exibido em duas visitas
- **THEN** o recorte é idêntico

### Requirement: Nitidez em repouso
Em repouso, as linhas MUST ser nítidas em telas de densidade 1 e 2.

#### Scenario: Tela comum
- **WHEN** um card é visto em tela de densidade 1
- **THEN** as retas não aparecem borradas nem duplicadas

### Requirement: Resposta a cada interação
Passar o ponteiro, pressionar, focar e selecionar SHALL ter resposta visível em até 100 ms, distinta entre si e não baseada só em cor.

#### Scenario: Foco por teclado
- **WHEN** um botão recebe foco por teclado
- **THEN** o contorno se fecha e muda de cor

#### Scenario: Movimento reduzido
- **WHEN** o visitante usa movimento reduzido
- **THEN** os estados continuam distinguíveis, sem animação

### Requirement: Tela projetada
Um card com imagem MUST NOT ampliar a imagem; a luz que desce e a borda interna em movimento SHALL existir apenas enquanto o ponteiro ou o foco está nele.

#### Scenario: Ponteiro em cima
- **WHEN** o ponteiro permanece sobre o card
- **THEN** a borda interna se move continuamente e a imagem mantém o tamanho

#### Scenario: Ponteiro sai
- **WHEN** o ponteiro sai
- **THEN** a luz some e a borda interna volta a ficar parada

### Requirement: Janela
Uma janela SHALL prender o foco, fechar com `Esc`, com o botão e com clique fora, e devolver o foco a quem a abriu.

#### Scenario: Fechar com Esc
- **WHEN** a janela está aberta e o visitante pressiona `Esc`
- **THEN** ela fecha e o foco volta ao elemento de origem
