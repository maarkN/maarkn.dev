## Purpose

Define como o terminal interpreta o que o visitante digita: resolução de comandos e aliases, mensagens de erro, histórico, autocomplete, atalhos de teclado e regras de apresentação da saída.

## ADDED Requirements

### Requirement: Resolução de comandos e aliases
Ao receber Enter, o terminal SHALL ecoar a linha com o PS1, dividir a entrada por espaços em nome e argumentos, resolver o nome de forma case-insensitive considerando aliases (`1`–`6` → itens do menu, `?`/`h` → `help`, `about`→`whoami`, `work`→`projects`, `blog`/`posts`→`writing`, `stack`→`skills`, `career`→`experience`, `resume`→`cv`) e executar o comando. Entrada vazia MUST apenas ecoar o prompt.

#### Scenario: Alias numérico
- **WHEN** o visitante digita `2`
- **THEN** o comando `experience` é executado e o item `experience` do menu é marcado como concluído

#### Scenario: Comando desconhecido
- **WHEN** o visitante digita `foo bar`
- **THEN** a saída é `bash: foo: command not found · type help` e nada mais é executado

### Requirement: Entrada nunca é interpretada como markup
Qualquer texto digitado que apareça na saída (eco, mensagens de erro, `echo`, `history`) MUST ser exibido literalmente.

#### Scenario: Tentativa de injeção
- **WHEN** o visitante digita `<img src=x onerror=alert(1)>`
- **THEN** a mensagem de erro exibe a string literal e nenhum elemento é criado

### Requirement: Histórico de comandos
O terminal SHALL manter o histórico da sessão sem duplicar entradas consecutivas iguais. `↑` MUST recuar no histórico e `↓` avançar; ao passar do item mais recente o campo MUST ficar vazio. O comando `history` SHALL listar as entradas numeradas.

#### Scenario: Navegar e sair do histórico
- **WHEN** o visitante executa `whoami`, `skills`, pressiona `↑` duas vezes e `↓` duas vezes
- **THEN** o campo mostra `skills`, depois `whoami`, depois `skills`, depois vazio

### Requirement: Autocomplete
`Tab` SHALL completar o nome do comando quando houver um único candidato (acrescentando espaço), completar até o prefixo comum quando houver vários, ou listar os candidatos quando o prefixo comum já estiver digitado. Após `cat `, o autocomplete MUST operar sobre os nomes de arquivo disponíveis.

#### Scenario: Prefixo único
- **WHEN** o campo contém `proj` e o visitante pressiona `Tab`
- **THEN** o campo passa a `projects `

#### Scenario: Vários candidatos
- **WHEN** o campo contém `w` e o visitante pressiona `Tab` duas vezes
- **THEN** o campo passa ao prefixo comum e, na segunda vez, a lista `whoami  writing  whereami` é impressa

### Requirement: Atalhos de teclado
`Ctrl+L` MUST limpar a saída. `Ctrl+C` sem texto selecionado MUST ecoar a linha atual seguida de `^C` e limpar o campo; com texto selecionado MUST preservar o comportamento nativo de copiar.

#### Scenario: Cancelar linha
- **WHEN** o campo contém `proj` e o visitante pressiona `Ctrl+C`
- **THEN** a saída mostra `maarkn@dev:~$ proj^C` e o campo fica vazio

### Requirement: Comandos de sistema
Os comandos `help`, `clear`/`cls`, `history`, `echo`, `date`, `theme [soft|classic]`, `font [caskaydia|daddytime]`, `exit`/`logout`, `sudo`, `rm`, `uptime` e `whereami` SHALL existir com as saídas definidas no mockup de referência. `theme` e `font` sem argumento MUST alternar o valor atual; `font daddytime` MUST avisar quando a fonte não estiver disponível no dispositivo.

#### Scenario: Alternar paleta pelo prompt
- **WHEN** o visitante digita `theme`
- **THEN** a paleta alterna e a saída informa `theme → classic · dracula classic, the original` (ou o equivalente para soft)

#### Scenario: Ajuda
- **WHEN** o visitante digita `help`
- **THEN** a saída lista cada comando com sua descrição, a linha `also try: …` e os atalhos de teclado

### Requirement: Apresentação da saída
Cada linha de saída SHALL entrar com uma pequena animação escalonada (máximo 480ms de atraso acumulado); ecos de prompt MUST aparecer instantaneamente; a tela MUST rolar até o fim após cada impressão. Comandos MAY produzir saída assíncrona, e o terminal MUST suportar anexar e substituir a última linha enquanto o comando ainda executa.

#### Scenario: Saída longa
- **WHEN** um comando imprime 40 linhas
- **THEN** a última linha fica visível sem intervenção do visitante e nenhuma linha demora mais de 480ms além da primeira
