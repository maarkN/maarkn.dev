# admin-shell Specification

## Purpose

Define a estrutura do backoffice: navegação, busca, conta, idioma e entrada, para achar qualquer tela em poucos passos.

## Requirements

### Requirement: Navegação em grupos
O menu SHALL agrupar as telas em Painel, Carreira, Site e Sistema, marcar a atual e poder ser recolhido mantendo os nomes disponíveis.

#### Scenario: Menu recolhido
- **WHEN** o menu está recolhido e um item recebe foco ou ponteiro
- **THEN** o nome aparece

#### Scenario: Tela ainda não construída
- **WHEN** um item leva a algo que não existe
- **THEN** aparece como "em breve", sem link nem foco

#### Scenario: Celular
- **WHEN** o backoffice é aberto em 390 px
- **THEN** há uma barra inferior com as telas principais e "Mais", sem rolagem horizontal

### Requirement: Busca e criação
O backoffice SHALL oferecer busca por telas, candidaturas e ações, e um botão para criar candidatura, compromisso, projeto e currículo.

#### Scenario: Abrir candidatura pela busca
- **WHEN** Marco busca pelo nome da empresa e confirma
- **THEN** o dossiê abre

#### Scenario: Nada encontrado
- **WHEN** a busca não encontra nada
- **THEN** diz isso, e `Esc` volta ao que estava

### Requirement: Dois idiomas
Toda a interface do backoffice SHALL existir em português e inglês, começar pelo idioma do site e poder ser trocada no menu da conta, sem mudar o endereço.

#### Scenario: Primeiro acesso em inglês
- **WHEN** o idioma escolhido no site é inglês e o backoffice é aberto pela primeira vez
- **THEN** a interface está em inglês

#### Scenario: Troca
- **WHEN** Marco troca para português
- **THEN** textos, datas e números mudam, e a escolha vale nos próximos acessos

#### Scenario: Conteúdo digitado
- **WHEN** a interface está em inglês
- **THEN** anotações escritas em português continuam como foram escritas

### Requirement: Datas e fuso
Datas SHALL seguir o idioma e o fuso configurado, com São Paulo como padrão. Data de calendário MUST NOT mudar de dia por causa do fuso.

#### Scenario: Data de envio
- **WHEN** uma candidatura foi enviada em 4 de agosto e o fuso é o de São Paulo
- **THEN** a data exibida é 4 de agosto nos dois idiomas

### Requirement: Entrada
O login SHALL usar o desenho do backoffice, sem navegação, e o erro MUST ser genérico e respeitar o limite de tentativas.

#### Scenario: Credencial inválida
- **WHEN** a senha está errada
- **THEN** a mensagem não revela se o e-mail existe

#### Scenario: Limite atingido
- **WHEN** o limite de tentativas é atingido
- **THEN** novas tentativas são recusadas pelo tempo definido

### Requirement: Acesso protegido
Toda tela do backoffice MUST exigir sessão.

#### Scenario: Sem sessão
- **WHEN** alguém abre uma tela sem sessão
- **THEN** vai para o login e nenhum dado da tela é entregue
