# theme-palette Specification

## Purpose

Define como o visitante escolhe e mantém a paleta de cores (Dracula soft ou classic) e a fonte monoespaçada da Versão CLI, garantindo aplicação consistente e sem flash. O tema do site está em site-theme.

## Requirements

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

### Requirement: Aplicação antes da hidratação, sem flash
A paleta e a fonte persistidas MUST ser aplicadas ao elemento raiz antes da primeira pintura, de forma que não ocorra troca visível de cor ou fonte após o carregamento.

#### Scenario: Retorno com preferência classic
- **WHEN** um visitante com `classic` salvo recarrega a página
- **THEN** o primeiro frame pintado já usa a paleta `classic`

### Requirement: Migração de preferências legadas
Valores de preferência anteriores MUST ser mapeados sem erro: `dark` e `dev` → `soft`; `light` → `classic`; valores desconhecidos → `soft`.

#### Scenario: Visitante com tema dev salvo
- **WHEN** a preferência armazenada é `dev`
- **THEN** a paleta `soft` é aplicada, a preferência é reescrita como `soft` e nenhum erro é registrado no console

### Requirement: Fonte alternativa não penaliza o carregamento padrão
A fonte `daddytime` MUST NOT ser baixada enquanto a fonte ativa for `caskaydia`.

#### Scenario: Carregamento padrão
- **WHEN** a página é carregada com a fonte padrão
- **THEN** nenhuma requisição ao arquivo DaddyTimeMono é feita
