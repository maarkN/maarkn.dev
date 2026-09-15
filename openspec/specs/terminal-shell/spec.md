# terminal-shell Specification

## Purpose

Descreve a estrutura visual e o comportamento básico de interação do terminal do portfólio: barra de status, menu de comandos, área de saída, prompt e comportamento responsivo.

## Requirements

### Requirement: Barra de status
O terminal SHALL exibir uma barra superior contendo, nesta ordem: identificador `maarkn@dev`, título curto do perfil, controle de paleta mostrando o valor atual, controle de fonte mostrando o valor atual e um relógio `HH:mm` do fuso do visitante. O relógio MUST atualizar a cada minuto sem recarregar a página.

#### Scenario: Controles refletem o estado
- **WHEN** o visitante ativa o controle de paleta
- **THEN** a paleta alterna entre `soft` e `classic` e o rótulo do controle mostra o novo valor

#### Scenario: Relógio sem mismatch de hidratação
- **WHEN** a página é servida pelo servidor
- **THEN** o relógio mostra `--:--` até o cliente assumir e nenhum aviso de hidratação é emitido

### Requirement: Menu de comandos
O terminal SHALL exibir um menu com os itens `whoami`, `experience`, `skills`, `projects`, `writing`, `contact`, `help` e `clear`, cada um com seu atalho (`1`–`6`, `?`, `⌫`). Ativar um item MUST solicitar a execução do comando correspondente. Itens de conteúdo já executados na sessão MUST ser marcados visualmente como concluídos.

#### Scenario: Ativação pelo menu
- **WHEN** o visitante ativa o item `projects`
- **THEN** o comando `projects` é solicitado, o item passa ao estado concluído e o foco volta ao prompt

### Requirement: MOTD
Acima da saída, o terminal SHALL exibir uma mensagem de boas-vindas com tagline, cidade/país, anos de experiência e quantidade de produtos, idiomas e status de disponibilidade, no idioma da rota. Os números MUST vir da mesma fonte usada pelos indicadores do site (sem duplicação de conteúdo).

#### Scenario: MOTD em pt-BR
- **WHEN** a rota é `/pt-BR/...`
- **THEN** os textos do MOTD aparecem em português e os números coincidem com os do dicionário `bigNumbers`

### Requirement: Prompt e foco
O terminal SHALL exibir um prompt `maarkn@dev:~$` seguido do texto digitado e de um cursor sintético. O campo de entrada real MUST ser invisível mas acessível (rótulo, `enterkeyhint`, sem autocorreção). Um clique na área da tela que não seja em link/botão e sem seleção de texto ativa MUST levar o foco ao campo. Quando o campo perde o foco, o cursor MUST mudar para o estado vazado.

#### Scenario: Digitação ecoa no prompt
- **WHEN** o visitante digita `hel`
- **THEN** o texto `hel` aparece após o PS1 e o cursor continua piscando

#### Scenario: Clique na tela foca o prompt
- **WHEN** o visitante clica em uma área vazia da tela de saída
- **THEN** o campo de entrada recebe foco sem rolar a página

### Requirement: Layout responsivo
Em larguras acima de 720px o menu SHALL ficar à esquerda (200px) e a tela à direita. Em 720px ou menos, o menu MUST virar uma faixa horizontal rolável no rodapé, o título da barra MUST ser ocultado e nenhuma rolagem horizontal da página SHALL ocorrer.

#### Scenario: Viewport de 390px
- **WHEN** o terminal é exibido em 390px de largura
- **THEN** o menu aparece no rodapé com rolagem horizontal própria e `document.documentElement.scrollWidth` é igual à largura da viewport

### Requirement: Movimento reduzido
Com `prefers-reduced-motion: reduce`, o piscar do cursor e as transições de entrada MUST ser desativados.

#### Scenario: Preferência ativa
- **WHEN** o sistema operacional sinaliza redução de movimento
- **THEN** o cursor fica estático e as linhas aparecem sem animação
