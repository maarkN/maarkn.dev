## Purpose

Define como um visitante envia uma mensagem de contato diretamente pelo prompt do terminal, com validação, cancelamento e confirmação de envio.

## ADDED Requirements

### Requirement: Fluxo interativo de envio
`mail` SHALL conduzir o visitante por perguntas sequenciais no prompt — nome, email, empresa (opcional), mensagem e confirmação `send? [Y/n]` — e, ao confirmar, enviar a mensagem pelo mesmo canal do formulário de contato anterior, exibindo confirmação de sucesso.

#### Scenario: Envio completo
- **WHEN** o visitante executa `mail`, responde todas as perguntas e confirma
- **THEN** a mensagem é enviada e a saída mostra `✓ sent` com a nota de prazo de resposta

### Requirement: Validação inline
Email inválido ou mensagem com menos de 10 caracteres MUST ser recusados com orientação e nova pergunta; após 3 tentativas inválidas no mesmo campo o fluxo MUST ser cancelado.

#### Scenario: Email inválido
- **WHEN** o visitante responde `jane@` na etapa de email
- **THEN** a saída pede um endereço válido e a pergunta é repetida

### Requirement: Cancelamento
`Ctrl+C` ou `Esc` em qualquer etapa MUST cancelar o fluxo com a mensagem `^C · mail cancelled` e devolver o prompt padrão.

#### Scenario: Cancelar na mensagem
- **WHEN** o visitante pressiona `Esc` na etapa de mensagem
- **THEN** nada é enviado e o prompt `maarkn@dev:~$` volta

### Requirement: Feedback de envio e falha
Durante o envio a saída MUST indicar `sending…`; em falha, MUST exibir erro em vermelho com o email direto como alternativa. Sem provedor de email configurado, o envio MUST ser registrado no servidor e a saída de sucesso exibida (mesma semântica do formulário anterior).

#### Scenario: Falha de rede
- **WHEN** a ação de envio falha
- **THEN** a saída sugere `email me directly at <email>`

### Requirement: Privacidade e limites
Respostas do fluxo MUST NOT entrar no histórico de comandos. O terminal MUST recusar um novo envio em menos de 60 segundos após o anterior, informando o tempo restante.

#### Scenario: Histórico
- **WHEN** o visitante conclui `mail` e pressiona `↑`
- **THEN** o campo mostra `mail`, nunca o email ou a mensagem digitados

#### Scenario: Envio repetido
- **WHEN** o visitante executa `mail` 20 segundos após um envio
- **THEN** a saída informa que deve aguardar 40 segundos

### Requirement: Dica em contact
A saída de `contact` SHALL incluir a linha `→ type mail to send a message from here`.

#### Scenario: contact
- **WHEN** o visitante executa `contact`
- **THEN** a última linha antes do rodapé aponta para `mail`
