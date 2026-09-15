## Purpose

Define como o terminal pode ser aberto em um estado específico por URL, como preserva o estado ao navegar e voltar, e como o visitante troca de idioma e de rota a partir do prompt.

## ADDED Requirements

### Requirement: Deep-link por parâmetro cmd
A home SHALL aceitar `?cmd=` com um ou mais comandos separados por `;` e executá-los, na ordem, assim que o terminal estiver pronto (após o boot ou imediatamente se já bootado). Apenas nomes registrados MUST ser aceitos; argumentos MUST ser limitados a letras, dígitos, espaço, ponto e hífen com no máximo 80 caracteres; entradas fora disso MUST ser ignoradas silenciosamente.

#### Scenario: Comando único
- **WHEN** o visitante abre `/en?cmd=projects`
- **THEN** a listagem de projetos já está impressa quando o prompt aparece

#### Scenario: Entrada inválida
- **WHEN** o visitante abre `/en?cmd=%3Cscript%3E`
- **THEN** nada é executado e o terminal abre normalmente

### Requirement: Estado preservado ao voltar
Ao navegar para uma página interna e retornar à home na mesma sessão, o terminal MUST reconstruir a saída dos últimos comandos executados (até 10) e restaurar o histórico. `clear` MUST descartar o estado salvo.

#### Scenario: Ida e volta
- **WHEN** o visitante executa `whoami`, `projects`, `open 1` e usa o botão voltar do navegador
- **THEN** a tela mostra as saídas de `whoami` e `projects` e `↑` recupera `open 1`

### Requirement: Troca de idioma
`lang` SHALL alternar entre `en` e `pt-BR`; `lang pt` e `lang en` SHALL selecionar diretamente. A troca MUST persistir a preferência de idioma usada pelo roteamento e levar o visitante à rota equivalente, mantendo o `?cmd` da tela atual. A barra de status SHALL exibir um controle de idioma com o valor atual.

#### Scenario: lang pt
- **WHEN** o visitante executa `lang pt` em `/en?cmd=skills`
- **THEN** é levado a `/pt-BR?cmd=skills` e visitas futuras sem prefixo caem em pt-BR

### Requirement: Comandos de navegação
`cd projects|career|blog|links` SHALL navegar para a rota correspondente; `cd` e `cd ~` SHALL voltar à home; `pwd` SHALL imprimir `/home/maarkn`; diretório desconhecido MUST retornar `cd: <nome>: no such directory`.

#### Scenario: cd blog
- **WHEN** o visitante executa `cd blog`
- **THEN** navega para `/{lang}/blog`

#### Scenario: Diretório inexistente
- **WHEN** o visitante executa `cd nada`
- **THEN** a saída é `cd: nada: no such directory`

### Requirement: Âncoras antigas
`/#contact`, `/#projects` e `/#about` MUST ser convertidos, sem recarregar, nos comandos `contact`, `projects` e `whoami` respectivamente.

#### Scenario: Link antigo
- **WHEN** o visitante abre `/en#contact`
- **THEN** a saída de `contact` é exibida

### Requirement: Retorno das páginas internas
O link `cd ..` das páginas internas SHALL levar à home com o comando de contexto (`?cmd=projects`, `?cmd=experience`, `?cmd=writing`) quando a página não tiver listagem própria.

#### Scenario: Voltar de um post
- **WHEN** o visitante ativa `cd ..` em `/en/blog/<slug>`
- **THEN** navega para `/en/blog`
