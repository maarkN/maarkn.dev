# Spec Delta

## MODIFIED Requirements

### Requirement: Orçamento de JavaScript
O JavaScript específico da home (excluindo o runtime do framework) MUST ser inferior a 60 kB comprimido, somados o motor da projeção e a interação das seções. O renderizador de markdown do assistente MUST ser carregado apenas quando o primeiro `ask` for executado.

#### Scenario: Primeira carga
- **WHEN** a home é carregada sem executar `ask`
- **THEN** nenhum chunk do renderizador de markdown é baixado

#### Scenario: Motor da projeção
- **WHEN** a home termina de carregar, com a projeção ativa
- **THEN** o JavaScript próprio baixado soma menos de 60 kB comprimidos

#### Scenario: Assistente fechada
- **WHEN** o visitante não abre a assistente nem a busca
- **THEN** o código delas não é baixado
