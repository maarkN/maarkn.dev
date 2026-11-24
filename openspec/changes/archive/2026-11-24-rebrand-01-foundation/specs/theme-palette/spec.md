# Spec Delta

## MODIFIED Requirements

### Requirement: Duas paletas Dracula disponíveis
A Versão CLI SHALL oferecer exatamente duas paletas: `soft` (padrão, fundo `#282A36`, cores dimmed) e `classic` (cores Dracula originais). A paleta ativa MUST ser refletida no atributo `data-theme` do elemento raiz e todas as cores da Versão CLI MUST derivar dos tokens da paleta ativa.

#### Scenario: Primeira visita sem preferência salva
- **WHEN** o visitante abre a Versão CLI sem preferência armazenada
- **THEN** a paleta `soft` é aplicada e `data-theme="soft"` está presente no elemento raiz

#### Scenario: Troca de paleta em tempo de execução
- **WHEN** o visitante alterna a paleta para `classic`
- **THEN** todas as cores da Versão CLI mudam sem recarregar e a preferência é persistida para visitas futuras

#### Scenario: Site não é afetado
- **WHEN** o visitante alterna a paleta na Versão CLI e volta ao site
- **THEN** o tema do site continua o mesmo

### Requirement: Duas fontes monoespaçadas selecionáveis
A Versão CLI SHALL oferecer as fontes `caskaydia` (padrão) e `daddytime`, refletidas no atributo `data-font` do elemento raiz. Toda a tipografia da Versão CLI MUST usar a fonte ativa; nenhuma fonte proporcional (sans/serif) SHALL ser carregada nela.

#### Scenario: Fonte padrão
- **WHEN** o visitante abre a Versão CLI sem preferência de fonte
- **THEN** o texto é renderizado em Cascadia Code e `data-font="caskaydia"` está presente

#### Scenario: Fonte alternativa
- **WHEN** o visitante seleciona `daddytime`
- **THEN** o texto passa a usar DaddyTimeMono sem recarregar e a preferência é persistida
