# Spec Delta

## ADDED Requirements

### Requirement: Endereço pedido é o endereço aberto
Um link ou comando que leva a uma página sem âncora MUST abri-la sem âncora, mesmo que o documento tenha sido carregado nessa página com uma. Vale nos dois idiomas.

#### Scenario: Volta à carreira
- **WHEN** o visitante abre `/en/career#nectar-crm`, vai a um caso e executa `cd ..`
- **THEN** o endereço é `/en/career` e a página abre no topo

#### Scenario: Âncora pedida
- **WHEN** o visitante segue um link para `/pt-BR/career#nectar-crm`
- **THEN** a página abre nessa experiência

#### Scenario: Voltar do navegador
- **WHEN** o visitante abre `/en/career#nectar-crm`, vai a um caso e usa o botão voltar
- **THEN** volta a `/en/career#nectar-crm`
