# Spec Delta

## MODIFIED Requirements

### Requirement: Estrutura semântica e skip link
A Versão CLI SHALL expor barra como `header`, menu como `nav` rotulado, tela como `main`, campo de comando com rótulo acessível e saída como região `aria-live="polite"`. O primeiro elemento focável MUST ser um link para pular ao campo de comando (Versão CLI).

#### Scenario: Primeiro Tab
- **WHEN** o visitante pressiona `Tab` ao carregar a Versão CLI
- **THEN** o foco vai para o link `skip to command line`

### Requirement: Contraste
Todo texto MUST atingir contraste mínimo de 4.5:1 (ou 3:1 quando ≥ 18px/negrito) sobre seu fundo nas duas paletas, incluindo o texto secundário (`comment`).

#### Scenario: Auditoria
- **WHEN** a Versão CLI é auditada com axe nas paletas `soft` e `classic`
- **THEN** nenhuma violação de contraste é reportada
