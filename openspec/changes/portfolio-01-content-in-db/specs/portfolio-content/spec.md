# Spec Delta

## Purpose

Define de onde vem o conteúdo dos projetos da vitrine pública, em que idiomas existe e como os casos de sucesso são escolhidos.

## ADDED Requirements

### Requirement: Conteúdo do projeto em dois idiomas
Cada projeto SHALL ter resumo, descrição, função e entregas em português e em inglês, editáveis sem publicar uma versão nova do site.

#### Scenario: Edição aparece no site
- **WHEN** o resumo em português de um projeto conhecido é alterado no banco
- **THEN** `/pt-BR/projects/<slug>` mostra o novo texto e `/en/projects/<slug>` continua igual

#### Scenario: Falta um idioma
- **WHEN** um projeto só tem texto em português e é aberto em `/en`
- **THEN** a página mostra o texto em português marcado com o idioma correto, e nenhum campo aparece vazio

### Requirement: Site funciona sem banco
Sem banco disponível, o site público MUST exibir os projetos com o conteúdo de semente do repositório.

#### Scenario: Build sem banco
- **WHEN** o site é construído e servido sem conexão com o banco
- **THEN** a listagem e o detalhe dos projetos da semente aparecem nos dois idiomas

#### Scenario: Banco cai em produção
- **WHEN** a leitura do banco falha durante uma visita
- **THEN** a página responde com a semente em vez de erro

### Requirement: Semente não sobrescreve edição
A sincronização da semente com o banco MUST criar projetos ausentes e MUST NOT alterar texto já existente. O preenchimento do texto que falta MUST acontecer uma única vez por banco.

#### Scenario: Texto editado sobrevive
- **WHEN** um texto foi editado no banco e a sincronização roda
- **THEN** o texto editado permanece

#### Scenario: Deploy não desfaz campo limpo
- **WHEN** um campo foi limpo no backoffice, ou um caso de sucesso foi desmarcado, e o site é publicado de novo
- **THEN** o campo continua vazio e o caso continua desmarcado

### Requirement: Galeria do projeto
Cada projeto SHALL aceitar imagens em ordem definida, com legenda nos dois idiomas.

#### Scenario: Projeto com galeria
- **WHEN** um projeto tem três imagens
- **THEN** o detalhe as exibe na ordem definida, com a legenda do idioma da página e texto alternativo

#### Scenario: Projeto sem imagens
- **WHEN** um projeto não tem imagens
- **THEN** a seção de galeria não aparece

### Requirement: Casos de sucesso escolhidos
A home SHALL exibir no máximo três casos de sucesso, escolhidos e ordenados por Marco, cada um com problema, trabalho e resultado nos dois idiomas.

#### Scenario: Quarto caso
- **WHEN** já há três casos e um quarto é marcado
- **THEN** a marcação é recusada com a explicação de que é preciso desmarcar um

#### Scenario: Caso sem texto
- **WHEN** um projeto sem problema, trabalho e resultado é marcado como caso
- **THEN** a marcação é recusada indicando o que falta
