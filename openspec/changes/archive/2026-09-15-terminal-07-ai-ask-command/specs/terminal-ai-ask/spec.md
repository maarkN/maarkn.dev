## Purpose

Define como o visitante conversa com o assistente de IA de dentro do terminal, incluindo streaming, contexto, cancelamento, limites de uso e modo degradado.

## ADDED Requirements

### Requirement: Comando ask
`ask <pergunta>` SHALL enviar a pergunta ao assistente do site e exibir a resposta em streaming, token a token, na saída do terminal, precedida de um indicador de processamento. `ask` sem argumento MUST exibir instrução de uso com exemplo.

#### Scenario: Pergunta simples
- **WHEN** o visitante executa `ask what stack do you use?`
- **THEN** um indicador `thinking…` aparece e é substituído progressivamente pela resposta conforme os tokens chegam

### Requirement: Markdown no estilo do terminal
Respostas em markdown MUST ser renderizadas com negrito, listas, links clicáveis e blocos de código legíveis nas duas paletas, sem sair da tipografia monoespaçada.

#### Scenario: Resposta com lista e link
- **WHEN** a resposta contém uma lista e um link
- **THEN** a lista aparece com marcadores e o link é clicável, abrindo em nova aba quando externo

### Requirement: Contexto de conversa
Perguntas sucessivas na mesma sessão MUST compartilhar contexto. `ask --new` e `clear` SHALL reiniciar a conversa.

#### Scenario: Pergunta de acompanhamento
- **WHEN** o visitante pergunta sobre um projeto e depois executa `ask and what was your role there?`
- **THEN** a resposta se refere ao projeto da pergunta anterior

### Requirement: Cancelamento
`Ctrl+C` durante o streaming MUST abortar a requisição e registrar `^C` na saída, mantendo o texto já recebido.

#### Scenario: Abortar no meio
- **WHEN** o visitante pressiona `Ctrl+C` após receber parte da resposta
- **THEN** o streaming para, a requisição é cancelada e o texto parcial permanece visível

### Requirement: Limite de uso e falhas
Quando o servidor recusar por limite de uso, a saída MUST informar o limite e quando tentar novamente, sem detalhes técnicos. Em falha de rede, MUST sugerir contato direto.

#### Scenario: Rate limit
- **WHEN** o visitante excede o limite horário de mensagens
- **THEN** a saída mostra uma mensagem em vermelho com o limite e o horário de nova tentativa

### Requirement: Modo degradado
Sem chave de API configurada, `ask` MUST continuar respondendo com as respostas de demonstração do endpoint.

#### Scenario: Ambiente sem chave
- **WHEN** `ask` é executado em um ambiente sem provedor de IA configurado
- **THEN** uma resposta de demonstração é exibida em streaming

### Requirement: Fallback de comando desconhecido
Quando o fallback estiver habilitado por configuração, uma entrada não reconhecida com três ou mais palavras SHALL ser encaminhada ao assistente com aviso explícito; desabilitado (padrão), MUST retornar o erro padrão de comando não encontrado. Entradas iniciadas por `/` MUST NOT ser encaminhadas.

#### Scenario: Fallback desligado
- **WHEN** o visitante digita `how do you handle multitenancy` com o fallback desabilitado
- **THEN** a saída é `bash: how: command not found · type help`

#### Scenario: Fallback ligado
- **WHEN** o visitante digita a mesma frase com o fallback habilitado
- **THEN** a saída avisa `asking the assistant instead` e a resposta é exibida em streaming

### Requirement: Registro administrativo preservado
Conversas iniciadas pelo terminal MUST ser registradas no log de chat do painel administrativo como as do chat anterior.

#### Scenario: Consulta no admin
- **WHEN** o administrador abre o log de chat após uma sessão de `ask`
- **THEN** as mensagens da sessão aparecem listadas
