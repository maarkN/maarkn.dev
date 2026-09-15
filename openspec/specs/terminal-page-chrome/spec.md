# terminal-page-chrome Specification

## Purpose

Define como as páginas internas do portfólio se apresentam dentro da linguagem visual do terminal, mantendo o conteúdo, as URLs e a indexação existentes.

## Requirements

### Requirement: Chrome comum
Toda página interna SHALL exibir a barra de status (com o caminho da página no lugar do título, controles de paleta/fonte e relógio), um breadcrumb no formato de comando (`maarkn@dev:~$ cat projects/<slug>.md`, `ls projects/`, `less blog/<slug>.md`, `cat career/<slug>.log`, `cat links.sh`), o conteúdo em coluna de no máximo 82ch e um rodapé com email, LinkedIn, GitHub e CV. A página MUST rolar normalmente.

#### Scenario: Página de projeto
- **WHEN** o visitante abre `/en/projects/<slug>`
- **THEN** a barra mostra `~/projects/<slug>`, o breadcrumb mostra `cat projects/<slug>.md` e o conteúdo rola com a página

### Requirement: Voltar como comando
Cada página interna SHALL oferecer um link de retorno estilizado como comando (`cd ..`) que leva à listagem correspondente ou à home com o comando de contexto.

#### Scenario: Voltar de um projeto
- **WHEN** o visitante ativa `cd ..` em uma página de projeto
- **THEN** navega para a listagem de projetos

### Requirement: Listagem de projetos
`/{lang}/projects` SHALL listar todos os projetos públicos no mesmo formato do comando `projects` (índice, slug, ano, categoria, status, descrição, stack), com um filtro por categoria em linha (`filter: all · ai · web · backend · mobile · client`) controlado pelo parâmetro `?cat=`.

#### Scenario: Filtro por URL
- **WHEN** o visitante abre `/en/projects?cat=ai`
- **THEN** apenas projetos da categoria `ai` são listados e o filtro `ai` aparece ativo

### Requirement: Detalhe de projeto
`/{lang}/projects/{slug}` SHALL exibir nome, tabela de metadados (ano, categoria, status, stack, links), descrição, papel, funcionalidades e, quando houver, galeria como imagens simples com legenda. Links externos (`open live ↗`, `view repo ↗`) SHALL abrir em nova aba; projetos privados MUST indicar `private repo` sem link.

#### Scenario: Projeto privado
- **WHEN** o projeto tem `sourceVisibility = private`
- **THEN** a página mostra `private repo` no lugar do link de repositório

### Requirement: Carreira
`/{lang}/career` SHALL exibir a mesma listagem do comando `experience` com âncoras por posição; `/{lang}/career/{slug}` SHALL exibir período, empresa, cargo, tecnologias e o texto completo da posição.

#### Scenario: Âncora
- **WHEN** o visitante abre `/en/career#nectar-crm`
- **THEN** a página rola até a posição correspondente

### Requirement: Blog
`/{lang}/blog` SHALL listar posts no formato do comando `writing`. `/{lang}/blog/{slug}` SHALL renderizar o conteúdo do post em tipografia monoespaçada legível: títulos com prefixo `## `/`### `, blocos de código com fundo distinto, citações com barra lateral, listas, imagens com legenda, links em ciano, mantendo o tempo de leitura e a data.

#### Scenario: Post com elementos variados
- **WHEN** um post contém h2, código, citação, lista e imagem
- **THEN** todos são legíveis nas paletas `soft` e `classic` sem estouro horizontal

### Requirement: Links
`/{lang}/links` SHALL exibir `cat links.sh` com email, LinkedIn, GitHub, WhatsApp, CV, Instagram e status de disponibilidade, sem fotografia.

#### Scenario: Página de links
- **WHEN** o visitante abre `/en/links`
- **THEN** vê os seis canais como links e o status de disponibilidade

### Requirement: Conteúdo e indexação preservados
Texto, URLs, metadata (`title`, `description`, `alternates`, OG) e revalidação das páginas internas MUST permanecer equivalentes aos anteriores à mudança.

#### Scenario: Comparação de texto
- **WHEN** o texto renderizado de `/en/projects/<slug>` é extraído antes e depois da mudança
- **THEN** o conteúdo textual é equivalente (apenas ordem/rotulagem podem diferir)

### Requirement: Responsividade
Em 390px de largura nenhuma página interna SHALL apresentar rolagem horizontal; tabelas de metadados MUST colapsar para uma coluna.

#### Scenario: Celular
- **WHEN** `/en/blog/<slug>` é aberto em 390px
- **THEN** `scrollWidth` da página é igual à largura da viewport
