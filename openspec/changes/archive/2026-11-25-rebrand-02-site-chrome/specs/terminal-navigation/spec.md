# Spec Delta

## MODIFIED Requirements

### Requirement: Deep-link por parâmetro cmd
A Versão CLI SHALL aceitar `?cmd=` com um ou mais comandos separados por `;` e executá-los, na ordem, assim que o terminal estiver pronto (após o boot ou imediatamente se já bootado). Apenas nomes registrados MUST ser aceitos (os atalhos numéricos do menu, `1`…`6`, não valem por link); argumentos MUST ser limitados a letras, dígitos, espaço, ponto e hífen com no máximo 80 caracteres; entradas fora disso MUST ser ignoradas silenciosamente.

#### Scenario: Comando único
- **WHEN** o visitante abre `/en/terminal?cmd=projects`
- **THEN** a listagem de projetos já está impressa quando o prompt aparece

#### Scenario: Entrada inválida
- **WHEN** o visitante abre `/en/terminal?cmd=%3Cscript%3E`
- **THEN** nada é executado e o terminal abre normalmente

#### Scenario: Link antigo na home
- **WHEN** o visitante abre `/en?cmd=projects`
- **THEN** é levado a `/en/terminal?cmd=projects`

### Requirement: Estado preservado ao voltar
Ao navegar para uma página do site e retornar à Versão CLI na mesma sessão, o terminal MUST reconstruir a saída dos últimos comandos executados (até 10) e restaurar o histórico. `clear` MUST descartar os comandos salvos da tela (a tela reconstruída fica vazia); o histórico permanece, como em qualquer shell.

#### Scenario: Ida e volta
- **WHEN** o visitante executa `whoami`, `projects`, `open 1` e usa o botão voltar do navegador
- **THEN** a tela mostra as saídas de `whoami` e `projects` e `↑` recupera `open 1`

#### Scenario: clear
- **WHEN** o visitante executa `whoami`, depois `clear`, e recarrega a página
- **THEN** a tela abre vazia e `↑` ainda recupera `clear`

### Requirement: Troca de idioma
`lang` SHALL alternar entre `en` e `pt-BR`; `lang pt` e `lang en` SHALL selecionar diretamente. A troca MUST persistir a preferência de idioma usada pelo roteamento e levar o visitante à rota equivalente, mantendo o `?cmd` da tela atual. A barra de status SHALL exibir um controle de idioma com o valor atual.

#### Scenario: lang pt
- **WHEN** o visitante executa `lang pt` em `/en/terminal?cmd=skills`
- **THEN** é levado a `/pt-BR/terminal?cmd=skills` e visitas futuras sem prefixo caem em pt-BR

### Requirement: Comandos de navegação
`cd projects|career|blog|links` SHALL navegar para a rota correspondente; `cd` e `cd ~` SHALL voltar ao início da Versão CLI; `pwd` SHALL imprimir `/home/maarkn`; diretório desconhecido MUST retornar `cd: <nome>: no such directory`.

#### Scenario: cd blog
- **WHEN** o visitante executa `cd blog`
- **THEN** navega para `/{lang}/blog`

#### Scenario: Diretório inexistente
- **WHEN** o visitante executa `cd nada`
- **THEN** a saída é `cd: nada: no such directory`
