# Spec Delta

## Purpose

Define a estrutura comum das páginas do site: topo, busca, rodapé, idioma e a passagem para a Versão CLI.

## ADDED Requirements

### Requirement: Topo
Toda página do site SHALL exibir no topo a marca, as páginas principais, a busca, o idioma, o tema, o botão da Versão CLI e o contato.

#### Scenario: Página atual
- **WHEN** o visitante está em Projetos
- **THEN** o item Projetos aparece como atual, também para leitor de tela

#### Scenario: Celular
- **WHEN** o site é aberto em 390 px
- **THEN** páginas e seções ficam no menu da base e nada transborda na horizontal

### Requirement: Busca global
A busca SHALL abrir por botão e por `⌘K` ou `Ctrl+K`, encontrar seções, páginas, projetos, experiências, temas, idioma e CV, e ignorar acentos e caixa.

#### Scenario: Por tecnologia
- **WHEN** o visitante busca "flutter"
- **THEN** aparecem os projetos e as experiências com Flutter

#### Scenario: Sem resultado
- **WHEN** a busca não encontra nada
- **THEN** oferece enviar a frase à assistente

#### Scenario: Só teclado
- **WHEN** o visitante abre a busca, usa as setas e pressiona `Enter`
- **THEN** vai ao item escolhido sem usar o ponteiro

### Requirement: Versão CLI acessível
O site SHALL oferecer a Versão CLI no topo, na busca e no rodapé, e ela SHALL oferecer o caminho de volta ao site.

#### Scenario: Ida e volta
- **WHEN** o visitante abre a Versão CLI e volta
- **THEN** chega à página em que estava

### Requirement: Idioma
A troca de idioma SHALL levar à página equivalente e valer nas próximas visitas.

#### Scenario: No detalhe de um projeto
- **WHEN** o visitante troca para inglês em `/pt-BR/projects/<slug>`
- **THEN** vai para `/en/projects/<slug>`

#### Scenario: Página com filtro
- **WHEN** há busca ou filtro na URL
- **THEN** eles são mantidos

### Requirement: Passagem entre páginas
Ao trocar de página, o foco SHALL ir ao título principal. Voltar à home MUST restaurar a posição de rolagem.

#### Scenario: Voltar
- **WHEN** o visitante abre um projeto a partir do meio da home e volta
- **THEN** a home reaparece na mesma posição

#### Scenario: Sem suporte a transições
- **WHEN** o navegador não tem transições de página
- **THEN** a troca é imediata e tudo funciona
