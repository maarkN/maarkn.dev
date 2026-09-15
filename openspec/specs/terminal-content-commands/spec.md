# terminal-content-commands Specification

## Purpose

Define o que cada comando de conteúdo do terminal exibe, de onde os dados vêm, como se comportam em pt-BR/en e o que acontece em caso de erro ou indisponibilidade de fonte.

## Requirements

### Requirement: Conteúdo vem das fontes canônicas do site
Os comandos de conteúdo MUST obter dados das mesmas fontes usadas pelas páginas internas: projetos do repositório de projetos (com fallback estático), experiência da timeline e dicionários, skills do toolkit, posts do CMS (com mocks quando indisponível) e contatos da configuração do site. Nenhum dado de conteúdo SHALL ser duplicado dentro do código do terminal.

#### Scenario: Projeto criado no admin
- **WHEN** um projeto destacado é criado no painel administrativo e a revalidação ocorre
- **THEN** ele aparece na saída de `projects` sem alteração de código

#### Scenario: CMS indisponível
- **WHEN** o CMS de blog não está configurado ou falha
- **THEN** `writing` exibe os posts de fallback do site, sem mensagem de erro técnica

### Requirement: whoami
`whoami` SHALL exibir nome, cargo, localização, parágrafos de bio, uma tabela com anos de experiência, produtos entregues, stacks e países (valores idênticos aos indicadores do site) e uma dica para `experience` e `contact`.

#### Scenario: whoami em pt-BR
- **WHEN** o visitante executa `whoami` em `/pt-BR`
- **THEN** os parágrafos aparecem em português e os números coincidem com os de `bigNumbers`

### Requirement: experience
`experience` SHALL listar todas as posições da timeline, da mais recente para a mais antiga, com período, cargo, empresa, descrição e um link interno `read full case ↗` para a página da posição, encerrando com link para a página de carreira.

#### Scenario: Link do caso
- **WHEN** o visitante ativa `read full case ↗` da primeira posição
- **THEN** a navegação vai para `/{lang}/career/{slug}` sem abrir nova aba

### Requirement: skills
`skills` SHALL exibir os grupos do toolkit (uma linha por grupo com os itens separados por ` · `) seguidos das métricas de capacidade como barras de 20 blocos com percentual.

#### Scenario: Barra de capacidade
- **WHEN** a métrica `api architecture` vale 95
- **THEN** a linha mostra 19 blocos preenchidos, 1 vazio e `95%`

### Requirement: projects, open
`projects` SHALL listar os projetos destacados numerados a partir de 1, com slug como link interno, ano, categoria, status (`● live`, `● under NDA`, `● internal`), descrição e stack, e um rodapé com a contagem e link para a página de projetos. `open <n>` SHALL navegar para o projeto de índice `n` da última listagem; índice inválido MUST retornar `open: pick a number 1–N · see projects`.

#### Scenario: Abrir projeto válido
- **WHEN** o visitante executa `projects` e depois `open 2`
- **THEN** a saída mostra `opening <slug>` e a navegação vai para a página do segundo projeto

#### Scenario: Índice inválido
- **WHEN** o visitante executa `open 99`
- **THEN** a saída é a mensagem de erro com o intervalo válido e nenhuma navegação ocorre

### Requirement: writing, read
`writing` SHALL listar até 6 posts mais recentes numerados, com título como link interno, categoria, data `YYYY-MM` e tempo de leitura; `read <n>` SHALL navegar para o post `n`. Sem posts, MUST exibir uma mensagem amigável de lista vazia.

#### Scenario: Ler post
- **WHEN** o visitante executa `writing` e `read 1`
- **THEN** a navegação vai para `/{lang}/blog/{slug}` do primeiro post

### Requirement: contact e cv
`contact` SHALL exibir email, LinkedIn, GitHub, WhatsApp, CV, status de disponibilidade e fuso horário. `cv` SHALL abrir o PDF do currículo em nova aba e imprimir o link.

#### Scenario: Abrir CV
- **WHEN** o visitante executa `cv`
- **THEN** o PDF `marco-filho.pdf` é aberto em nova aba e a saída contém um link para ele

### Requirement: ls e cat
`ls` SHALL listar `whoami.txt experience.log skills.sys projects.db writing.md contact.sh cv.pdf`. `cat <arquivo>` SHALL executar o comando correspondente; sem argumento MUST responder `cat: missing file · try ls`; arquivo inexistente MUST responder `cat: <nome>: no such file · try ls`.

#### Scenario: cat de arquivo conhecido
- **WHEN** o visitante executa `cat skills.sys`
- **THEN** a saída é idêntica à de `skills`

### Requirement: neofetch
`neofetch` SHALL exibir a arte ASCII do monograma, a tabela `os/host/uptime/shell/kernel/packages/editor/status` e as oito amostras de cor da paleta ativa.

#### Scenario: Amostras seguem a paleta
- **WHEN** o visitante executa `neofetch` e depois `theme classic`
- **THEN** as amostras já impressas passam a exibir as cores da paleta `classic`

### Requirement: Nomes de comandos e arquivos são invariantes
Em qualquer idioma, os nomes de comandos, aliases e arquivos MUST permanecer em inglês; apenas descrições, cabeçalhos e mensagens SHALL ser traduzidos.

#### Scenario: help em pt-BR
- **WHEN** o visitante executa `help` em `/pt-BR`
- **THEN** os nomes `whoami`, `projects`… aparecem inalterados e as descrições em português
