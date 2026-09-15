## Purpose

Garante que o terminal e as páginas internas sejam operáveis por teclado, compreensíveis por leitores de tela e legíveis (contraste, zoom, toque) conforme WCAG 2.1 AA.

## ADDED Requirements

### Requirement: Estrutura semântica e skip link
A home SHALL expor barra como `header`, menu como `nav` rotulado, tela como `main`, campo de comando com rótulo acessível e saída como região `aria-live="polite"`. O primeiro elemento focável MUST ser um link para pular ao campo de comando (home) ou ao conteúdo (páginas internas).

#### Scenario: Primeiro Tab
- **WHEN** o visitante pressiona `Tab` ao carregar a home
- **THEN** o foco vai para o link `skip to command line`

### Requirement: Boot acessível
Durante o boot, leitores de tela MUST receber um único anúncio (`booting… press any key to skip`) e não o texto digitado caractere a caractere.

#### Scenario: Leitor de tela no boot
- **WHEN** o boot inicia com um leitor de tela ativo
- **THEN** apenas a frase única é anunciada

### Requirement: Saída anunciada e navegável
Cada comando SHALL produzir um bloco de saída rotulado (`output of <comando>`); a animação de entrada MUST ser apenas visual, com o texto presente no DOM desde o início. Após um comando, o foco MUST permanecer no campo; após navegar para uma página interna, o foco MUST ir ao título principal.

#### Scenario: Executar help
- **WHEN** o visitante executa `help` com leitor de tela
- **THEN** o conteúdo da ajuda é anunciado uma vez e o foco continua no campo

### Requirement: Teclado
Toda funcionalidade MUST ser operável por teclado. Como `Tab` no campo aciona o autocomplete, `Esc` MUST mover o foco para o menu de comandos; com o campo vazio, `Tab` SHALL mover o foco para o skip link em vez de listar todos os comandos. Atalhos numéricos MUST valer apenas quando digitados no prompt, nunca como teclas globais. Indicadores de foco MUST ser visíveis em todos os controles.

#### Scenario: Sair do campo
- **WHEN** o visitante pressiona `Esc` no campo vazio
- **THEN** o foco vai para o primeiro item do menu

#### Scenario: Tab no campo vazio
- **WHEN** o visitante pressiona `Tab` no campo vazio
- **THEN** o foco vai para o link `skip to command line`

### Requirement: Contraste
Todo texto MUST atingir contraste mínimo de 4.5:1 (ou 3:1 quando ≥ 18px/negrito) sobre seu fundo nas duas paletas, incluindo o texto secundário (`comment`).

#### Scenario: Auditoria
- **WHEN** a home é auditada com axe nas paletas `soft` e `classic`
- **THEN** nenhuma violação de contraste é reportada

### Requirement: Zoom, movimento e toque
O tamanho de fonte MUST respeitar a preferência do navegador (unidades relativas); a interface MUST permanecer utilizável a 200% de zoom; com redução de movimento nenhuma animação (incluindo rolagem suave) SHALL ocorrer; alvos de toque MUST ter no mínimo 44×44px.

#### Scenario: Zoom 200%
- **WHEN** o visitante aplica zoom de 200%
- **THEN** menu, prompt e saída continuam acessíveis sem sobreposição

### Requirement: Idioma do conteúdo
Nomes de comandos e arquivos inseridos em texto pt-BR MUST ser marcados com o idioma inglês para pronúncia correta; o elemento raiz MUST refletir o idioma da rota.

#### Scenario: help em pt-BR
- **WHEN** um leitor de tela lê a saída de `help` em `/pt-BR`
- **THEN** `whoami` é lido como palavra em inglês

### Requirement: Páginas internas
Páginas internas MUST ter hierarquia de cabeçalhos correta, breadcrumb rotulado e imagens com texto alternativo.

#### Scenario: Auditoria de post
- **WHEN** `/en/blog/<slug>` é auditado com axe
- **THEN** nenhuma violação é reportada
