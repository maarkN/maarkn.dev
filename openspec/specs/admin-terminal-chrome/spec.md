# admin-terminal-chrome Specification

## Purpose
Define como as telas do backoffice se apresentam dentro da linguagem visual do terminal do site, sem se tornarem um terminal operável.

## Requirements

### Requirement: Chrome comum do admin
Toda rota `/admin/**` autenticada SHALL exibir uma barra de status com `maarkn@dev`, o caminho da tela e o relógio, um breadcrumb no formato do comando que abriu a tela, o conteúdo, e um link de retorno `cd ..`. A barra MUST NOT exibir controles de paleta, fonte ou idioma.

#### Scenario: Listagem de candidaturas
- **WHEN** o administrador abre `/admin/applications`
- **THEN** a barra mostra `~/admin/applications` e o breadcrumb mostra `ls applications/`

#### Scenario: Detalhe de candidatura
- **WHEN** o administrador abre o detalhe de uma candidatura cujo `folderName` é `shopify-senior-backend-ca`
- **THEN** o breadcrumb mostra `cat applications/shopify-senior-backend-ca.md`

#### Scenario: Sem controle de tema
- **WHEN** qualquer rota `/admin/**` é carregada
- **THEN** nenhum chunk servido contém o provider de tema, e a barra não oferece troca de paleta ou fonte

### Requirement: Retorno como comando
Cada tela de detalhe, edição ou criação SHALL oferecer um `cd ..` que leva à listagem correspondente; as listagens SHALL levar a `~/admin`.

#### Scenario: Voltar da edição
- **WHEN** o administrador ativa `cd ..` em `/admin/applications/<id>/edit`
- **THEN** navega para o detalhe daquela candidatura

### Requirement: Menu como árvore de diretórios
O menu lateral SHALL renderizar as entradas como uma árvore com conectores, com `board` subordinado a `applications/`, e um ícone por entrada numa coluna de largura fixa entre o conector e o rótulo. Entradas de rotas ainda não construídas SHALL aparecer como comentário `# em breve`, sem foco nem link.

#### Scenario: Entrada futura
- **WHEN** o menu é renderizado com `replies` marcada como não pronta
- **THEN** `replies/` aparece em cor de comentário com `# em breve`, o ícone herda a mesma cor e o item não é focável por teclado

#### Scenario: Rótulos alinhados
- **WHEN** as 14 entradas do menu são renderizadas
- **THEN** todos os rótulos começam na mesma coluna, qualquer que seja o ícone

#### Scenario: Decoração não é lida
- **WHEN** um leitor de tela percorre o menu
- **THEN** anuncia apenas os nomes das entradas, sem os caracteres de conector e sem os ícones

### Requirement: Login como tty
`/admin/login` SHALL se apresentar como um console de login (`maarkn.dev tty1`, campos rotulados `login:` e `password:`) e MUST NOT exibir barra de status, árvore de navegação ou `cd ..`. Erro de credencial SHALL aparecer como linha de saída, sem revelar se o e-mail existe.

#### Scenario: Credencial inválida
- **WHEN** o administrador envia uma senha errada
- **THEN** a tela exibe uma linha de erro genérica e o controle de tentativas por IP continua valendo

### Requirement: Responsividade do chrome
Em 390px nenhuma rota `/admin/**` SHALL apresentar rolagem horizontal do documento, e o menu SHALL ser colapsável com o item ativo visível ao abrir.

#### Scenario: Celular
- **WHEN** `/admin/applications` é aberta em 390px
- **THEN** `scrollWidth` do documento é igual à largura da viewport
