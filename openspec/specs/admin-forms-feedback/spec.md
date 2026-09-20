# admin-forms-feedback Specification

## Purpose
Define como o backoffice pede entrada, valida, confirma ações destrutivas e devolve resultado, na linguagem do terminal e sem perder acessibilidade.

## Requirements

### Requirement: Campos com sotaque de terminal
Formulários do admin SHALL exibir ajuda como comentário, obrigatoriedade por extenso e rótulo em texto simples. O nome acessível de cada campo MUST ser igual ao seu rótulo visível.

#### Scenario: Campo obrigatório
- **WHEN** o administrador abre `/admin/applications/new`
- **THEN** campos obrigatórios são marcados por texto, não por asterisco isolado, e cada campo tem nome acessível igual ao rótulo

### Requirement: Erro como saída de erro
Erro de validação ou falha de ação SHALL ser exibido com prefixo `stderr:` na cor destrutiva. O prefixo MUST ser `aria-hidden` e a mensagem MUST continuar associada ao campo e anunciada como alerta.

#### Scenario: Validação falha
- **WHEN** um campo obrigatório é enviado vazio
- **THEN** a tela mostra `stderr: <mensagem>` e o leitor de tela anuncia apenas a mensagem

### Requirement: Ações em colchetes
Botões de ação SHALL usar rótulo entre colchetes, com os colchetes fazendo parte do texto do botão.

#### Scenario: Formulário salvo
- **WHEN** o administrador vê o rodapé de um formulário
- **THEN** encontra `[ salvar ]` e `[ cancelar ]` como botões reais, focáveis por teclado

### Requirement: Retorno como linha de saída
O retorno de uma ação SHALL aparecer como linha monoespaçada com marcador textual `✓` ou `✗`, sem ícone gráfico e sem canto arredondado. O marcador MUST ser `aria-hidden` e o texto MUST ser anunciado por região viva.

#### Scenario: Criação bem-sucedida
- **WHEN** uma candidatura é criada
- **THEN** aparece `✓` seguido da mensagem, e a mensagem é anunciada

#### Scenario: Falha de servidor
- **WHEN** a ação falha
- **THEN** aparece `✗` com a mensagem de erro, sem expor detalhe interno da exceção

### Requirement: Diálogos com barra de título
`Dialog`, `AlertDialog` e `Sheet` SHALL exibir o título como régua e oferecer `[esc]` como fechamento, que MUST corresponder ao atalho real. Ao fechar, o foco MUST retornar ao elemento que abriu o diálogo.

#### Scenario: Fechar com teclado
- **WHEN** o administrador pressiona `Esc` num diálogo aberto
- **THEN** o diálogo fecha e o foco volta ao gatilho

### Requirement: Confirmação destrutiva com eco do comando
Diálogos de exclusão SHALL exibir o comando equivalente e `[y/N]`, e MUST manter a confirmação por digitação do nome do registro. O eco MUST ser ilustrativo, sem executar comando algum.

#### Scenario: Exclusão de candidatura
- **WHEN** o administrador abre a exclusão de uma candidatura
- **THEN** vê `rm -rf applications/<pasta>` com `[y/N]`, e o botão de confirmação só habilita após digitar o nome exato

#### Scenario: Padrão é cancelar
- **WHEN** o diálogo destrutivo abre
- **THEN** a ação padrão é cancelar, coerente com o `N` maiúsculo
