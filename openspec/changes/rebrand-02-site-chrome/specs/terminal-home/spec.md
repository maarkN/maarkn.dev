# Spec Delta

## ADDED Requirements

### Requirement: Versão CLI em endereço próprio
As rotas `/en/terminal` e `/pt-BR/terminal` SHALL exibir o terminal (boot, barra, menu, prompt) e um caminho de volta ao site. As rotas `/`, `/en` e `/pt-BR` MUST NOT exibir o terminal.

#### Scenario: Acesso direto
- **WHEN** o visitante abre `/en/terminal`
- **THEN** vê o terminal em inglês, com o caminho de volta ao site

#### Scenario: Acesso à raiz
- **WHEN** o visitante abre `/`
- **THEN** é redirecionado para o idioma detectado e vê a home do site

#### Scenario: Idioma desconhecido
- **WHEN** o visitante abre `/fr/terminal`
- **THEN** recebe 404

## MODIFIED Requirements

### Requirement: Conteúdo útil sem JavaScript
A resposta do servidor para a Versão CLI MUST conter o MOTD, a bio equivalente à saída de `whoami` e links para projetos, carreira, blog, links, CV, LinkedIn e GitHub. Com JavaScript desabilitado, esse conteúdo MUST permanecer visível e os links clicáveis, sem overlay bloqueando.

#### Scenario: Crawler
- **WHEN** a Versão CLI é requisitada sem executar JavaScript
- **THEN** o HTML contém `href="/en/projects"` e o texto da bio

#### Scenario: JS desabilitado no navegador
- **WHEN** o visitante desabilita JavaScript e abre a Versão CLI
- **THEN** vê MOTD, bio e links, e consegue navegar para um projeto

## REMOVED Requirements

### Requirement: Home renderiza o terminal
**Reason**: A home passa a ser o site; o terminal ganha endereço próprio.
**Migration**: Abrir `/[lang]/terminal`; links `?cmd=` na home redirecionam.
