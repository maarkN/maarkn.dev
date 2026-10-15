## MODIFIED Requirements

### Requirement: Manifest de update
`GET /api/claude-remote/updates/manifest` SHALL devolver o update mais recente publicado para o canal (`expo-channel-name`, padrão `production`), o `expo-platform` e o `expo-runtime-version` do pedido, no protocolo Expo Updates 1, com a assinatura gravada na publicação, ou `204` quando não houver update. Pedidos sem plataforma válida, runtime ou com canal inválido MUST receber `400`, e outra versão de protocolo `406`. Manifests publicados antes dos canais SHALL valer como `production`.

#### Scenario: Update disponível
- **WHEN** o app iOS com runtime `abc` pede o manifest e há dois updates publicados para `ios`/`abc` no canal `production`
- **THEN** recebe o mais recente em `multipart/mixed`, com `expo-signature` na parte `manifest` e `expo-protocol-version: 1`

#### Scenario: Nada publicado
- **WHEN** não há update para o canal, a plataforma e o runtime pedidos
- **THEN** a resposta é `204`

#### Scenario: Canais separados
- **WHEN** há um update só em `development` e o app pede sem `expo-channel-name`
- **THEN** a resposta é `204`; com `expo-channel-name: development` recebe o update

### Requirement: Publicação autenticada
Publicar SHALL exigir `Authorization: Bearer` igual a `CLAUDE_REMOTE_UPDATES_TOKEN` (qualquer canal) ou a `CLAUDE_REMOTE_UPDATES_DEV_TOKEN` (só o canal `development` e assets). O servidor MUST recusar um asset cujo conteúdo não tenha o hash da URL e um manifest sem assinatura, com `runtimeVersion` divergente, com asset ausente ou com URL de asset que não aponte para a rota `assets/<hash>` do próprio hash. A chave privada de assinatura MUST NOT ser necessária no servidor.

#### Scenario: Token errado
- **WHEN** alguém envia um asset sem um token válido
- **THEN** a resposta é `401` e nada é gravado

#### Scenario: Token de desenvolvimento em produção
- **WHEN** o CI publica um manifest em `production` com `CLAUDE_REMOTE_UPDATES_DEV_TOKEN`
- **THEN** a resposta é `403` e nada é gravado

#### Scenario: Hash divergente
- **WHEN** o corpo de um `PUT` não tem o SHA-256 da URL
- **THEN** a resposta é `400` e nada é gravado

#### Scenario: Recurso desligado
- **WHEN** nenhum token de publicação está configurado
- **THEN** as rotas de publicação respondem `404`
