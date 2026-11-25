# Spec Delta

## MODIFIED Requirements

### Requirement: Barra de status
O terminal SHALL exibir uma barra superior contendo, nesta ordem: identificador `maarkn@dev`, título curto do perfil, link de volta ao site, controle de paleta mostrando o valor atual, controle de fonte mostrando o valor atual e um relógio `HH:mm` do fuso do visitante. O relógio MUST atualizar a cada minuto sem recarregar a página.

#### Scenario: Controles refletem o estado
- **WHEN** o visitante ativa o controle de paleta
- **THEN** a paleta alterna entre `soft` e `classic` e o rótulo do controle mostra o novo valor

#### Scenario: Relógio sem mismatch de hidratação
- **WHEN** a página é servida pelo servidor
- **THEN** o relógio mostra `--:--` até o cliente assumir e nenhum aviso de hidratação é emitido
