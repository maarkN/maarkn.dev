# Comandos da Versão CLI

Argumentos, saída e erros de cada comando registrado. `pnpm docs:commands` confere que todo comando e todo alias estão aqui. Nomes de comandos, aliases e arquivos são em inglês nos dois idiomas; descrições e mensagens são traduzidas.

## Comandos de conteúdo

### whoami
Nome, cargo, localização, bio e os quatro números do site, com dica para `experience` e `contact`.

### experience
Todas as posições, da mais recente à mais antiga, com período, cargo, empresa, resumo e link para o caso; termina com o link da página de carreira.

### skills
Uma linha por grupo do toolkit e as métricas em barras de 20 blocos com percentual.

### projects
Projetos em destaque, numerados a partir de 1, com slug, ano, categoria, situação, descrição e stack; termina com a contagem e o link da página de projetos.

### open
`open <n>` abre o projeto `n` da última listagem. Índice inválido: `open: pick a number 1–N · see projects`.

### writing
Até 6 posts recentes, numerados, com título, categoria, data e tempo de leitura. Sem posts, mensagem de lista vazia.

### read
`read <n>` abre o post `n` da última listagem.

### contact
E-mail, LinkedIn, GitHub, WhatsApp, CV, disponibilidade e fuso.

### cv
Abre o PDF em nova aba e imprime o link.

### ls
Lista `whoami.txt experience.log skills.sys projects.db writing.md contact.sh cv.pdf`.

### cat
`cat <file>` executa o comando do arquivo. Sem argumento: `cat: missing file · try ls`. Inexistente: `cat: <nome>: no such file · try ls`.

### neofetch
Monograma em blocos, tabela do sistema e as oito amostras da paleta ativa.

## Comandos que conversam

### ask
`ask <question>` responde com a assistente, em streaming. `ask --new` esquece a conversa; `Ctrl+C` aborta. Sem pergunta: instrução de uso.

### mail
Formulário de contato como conversa: nome, e-mail, empresa, mensagem, `send? [Y/n]`. `Esc` ou `Ctrl+C` cancelam; as respostas não entram no histórico; uma mensagem por minuto por aba.

## Comandos de sistema

### help
Lista os comandos com descrição, a linha `also try` e os atalhos.

### clear
Limpa a tela e esquece a conversa do `ask`. O histórico permanece.

### cls
Igual a `clear`.

### theme
`theme [soft|classic]` define a paleta; sem argumento, alterna. Vale só para a Versão CLI.

### font
`font [caskaydia|daddytime]` define a fonte; sem argumento, alterna. `daddytime` avisa quando a fonte não está disponível.

### history
Entradas da sessão, numeradas. Vazio: mensagem própria.

### uptime
Há quanto tempo isto está no ar.

### date
Data e hora atuais.

### echo
Imprime os argumentos, literalmente.

### whereami
Onde Marco está.

### sudo
Pede senha e nega, com humor.

### rm
Nega a remoção, citando o alvo.

### exit
Despede-se e sugere `contact`.

### logout
Igual a `exit`.

### reboot
Roda a sequência de boot de novo.

### ping
Teste de latência encenado, linha a linha; `Ctrl+C` interrompe.

### git
Remotes e links públicos.

### hack
Piada que termina em `contact`.

## Navegação

### cd
`cd projects|career|blog|links` navega para a página do site; `cd` e `cd ~` voltam ao início da Versão CLI (`/[lang]/terminal`). Desconhecido: `cd: <nome>: no such directory`.

### pwd
Imprime `/home/maarkn`.

### lang
`lang [en|pt]` troca o idioma, mantém o `?cmd` da tela e guarda a preferência; sem argumento, alterna. Valor desconhecido: mensagem com dica.

## Aliases

| Alias | Comando |
|---|---|
| `1` | whoami |
| `2` | experience |
| `3` | skills |
| `4` | projects |
| `5` | writing |
| `6` | contact |
| `?` | help |
| `h` | help |
| `about` | whoami |
| `work` | projects |
| `blog` | writing |
| `posts` | writing |
| `stack` | skills |
| `career` | experience |
| `resume` | cv |

## Atalhos

| Tecla | Efeito |
|---|---|
| `Tab` | Completa comandos, arquivos de `cat` e diretórios de `cd`; com o campo vazio, vai para o skip link |
| `↑` `↓` | Percorre o histórico |
| `Ctrl+L` | Limpa a tela |
| `Ctrl+C` | Cancela a linha ou aborta o comando; com texto selecionado, copia |
| `Esc` | Sai do campo para o menu |
