# Spec Delta

## ADDED Requirements

### Requirement: Backoffice nos três temas
Todas as rotas `/admin/**` SHALL usar o tema escolhido pela pessoa, entre os três do site, com a mesma preferência, e oferecer a troca no menu da conta.

#### Scenario: Preferência do site
- **WHEN** Marco usa claro suave no site e abre o backoffice
- **THEN** o backoffice está em claro suave

#### Scenario: Preferência da Versão CLI
- **WHEN** a Versão CLI está em `classic`
- **THEN** o backoffice não muda

### Requirement: Tokens do backoffice derivados do tema
As rotas `/admin/**` SHALL obter toda cor e borda dos tokens do tema ativo, e MUST NOT usar cor literal fora das exceções documentadas.

#### Scenario: Troca de tema
- **WHEN** Marco troca o tema
- **THEN** todas as telas mudam por completo, sem elemento com a cor anterior

#### Scenario: Cor literal introduzida
- **WHEN** uma cor literal é introduzida numa tela do backoffice
- **THEN** a verificação do projeto falha apontando o arquivo

## MODIFIED Requirements

### Requirement: Contraste dos pares de token
Todo par texto/fundo do admin MUST atingir 4.5:1, e toda borda de controle (input, select, textarea) MUST atingir 3:1 em repouso. Vale nos três temas. Onde um tema não alcança, o admin SHALL elevar o valor localmente e registrar no CSS o número medido e o motivo.

#### Scenario: Botão primário
- **WHEN** o botão principal é medido em cada tema
- **THEN** o texto atinge ao menos 4.5:1 sobre o preenchimento

#### Scenario: Borda de campo em repouso
- **WHEN** um input do admin não está em foco
- **THEN** sua borda atinge ao menos 3:1 contra a superfície em que está

## REMOVED Requirements

### Requirement: Admin na paleta soft, sem seletor de tema
**Reason**: O backoffice passa a oferecer os três temas.
**Migration**: Ver "Backoffice nos três temas".

### Requirement: Tokens do admin derivados da paleta
**Reason**: Os tokens passam a derivar do tema ativo.
**Migration**: Ver "Tokens do backoffice derivados do tema".
