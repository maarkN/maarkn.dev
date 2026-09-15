## Purpose

Define o comportamento da página inicial como terminal: o que é entregue pelo servidor, o que acontece sem JavaScript, metadata da página e redirecionamentos de rotas antigas.

## ADDED Requirements

### Requirement: Home renderiza o terminal
As rotas `/`, `/en` e `/pt-BR` SHALL exibir o terminal (boot, barra, menu, prompt). A rota de preview `/{lang}/terminal` MUST NOT existir mais.

#### Scenario: Acesso à raiz
- **WHEN** o visitante abre `/`
- **THEN** é redirecionado para o idioma detectado e vê o terminal

#### Scenario: Preview removido
- **WHEN** o visitante abre `/en/terminal`
- **THEN** recebe 404

### Requirement: Conteúdo útil sem JavaScript
A resposta do servidor para a home MUST conter o MOTD, a bio equivalente à saída de `whoami` e links para projetos, carreira, blog, links, CV, LinkedIn e GitHub. Com JavaScript desabilitado, esse conteúdo MUST permanecer visível e os links clicáveis, sem overlay bloqueando.

#### Scenario: Crawler
- **WHEN** a home é requisitada sem executar JavaScript
- **THEN** o HTML contém `href="/en/projects"` e o texto da bio

#### Scenario: JS desabilitado no navegador
- **WHEN** o visitante desabilita JavaScript e abre a home
- **THEN** vê MOTD, bio e links, e consegue navegar para um projeto

### Requirement: Hidratação adota o conteúdo do servidor
Ao hidratar, o terminal MUST tratar a saída renderizada pelo servidor como o primeiro resultado da sessão, sem duplicá-la nem removê-la abruptamente.

#### Scenario: Primeira interação
- **WHEN** o visitante executa `help` logo após a hidratação
- **THEN** a saída de `whoami` inicial continua acima e aparece uma única vez

### Requirement: Identidade e metadata
O título da home SHALL ser `Marco Filho — maarkn@dev` (com equivalente pt-BR), a cor de tema do navegador `#282A36`, o favicon o glifo `>_` sobre fundo escuro e o manifest coerente com essas cores. O JSON-LD de pessoa e site MUST continuar presente.

#### Scenario: Aba do navegador
- **WHEN** a home é aberta
- **THEN** a aba exibe o novo favicon e o título definido

### Requirement: Rotas antigas de chat
`/{lang}/chat` SHALL redirecionar para `/{lang}?cmd=ask`. O chat flutuante MUST NOT ser exibido em nenhuma rota.

#### Scenario: Link antigo para o chat
- **WHEN** o visitante abre `/en/chat`
- **THEN** é redirecionado para a home com o comando `ask` pré-preenchido no prompt
