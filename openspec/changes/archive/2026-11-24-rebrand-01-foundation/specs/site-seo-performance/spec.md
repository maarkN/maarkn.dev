# Spec Delta

## MODIFIED Requirements

### Requirement: Fontes
No site, apenas as fontes da primeira tela MUST ser pré-carregadas. Na Versão CLI, apenas a fonte padrão MUST ser pré-carregada e a alternativa MUST ser baixada somente quando selecionada. Nenhuma experiência SHALL baixar fontes exclusivas da outra. As fontes MUST incluir os glifos necessários para pt-BR.

#### Scenario: Acentos
- **WHEN** um texto com `ã`, `ç`, `é` é exibido
- **THEN** os glifos vêm da fonte ativa, sem fallback visível

#### Scenario: Site não baixa a fonte alternativa
- **WHEN** a home é carregada
- **THEN** nenhuma requisição à DaddyTimeMono é feita
