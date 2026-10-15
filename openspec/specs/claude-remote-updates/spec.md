# claude-remote-updates Specification

## Purpose
Servidor de atualizações OTA (protocolo Expo Updates 1) do app Claude Remote: manifests assinados pelo publicador e assets imutáveis endereçados por conteúdo.

## Requirements

### Requirement: Manifest de update
`GET /api/claude-remote/updates/manifest` SHALL devolver o update mais recente publicado para o `expo-platform` e o `expo-runtime-version` do pedido, no protocolo Expo Updates 1, com a assinatura gravada na publicação, ou `204` quando não houver update. Pedidos sem plataforma válida ou runtime MUST receber `400`, e outra versão de protocolo `406`.

#### Scenario: Update disponível
- **WHEN** o app iOS com runtime `abc` pede o manifest e há dois updates publicados para `ios`/`abc`
- **THEN** recebe o mais recente em `multipart/mixed`, com `expo-signature` na parte `manifest` e `expo-protocol-version: 1`

#### Scenario: Nada publicado
- **WHEN** não há update para a plataforma e o runtime pedidos
- **THEN** a resposta é `204`

### Requirement: Assets imutáveis
`GET /api/claude-remote/updates/assets/<hash>` SHALL servir o arquivo cujo SHA-256 (base64url) é `<hash>`, com o `content-type` da publicação e cache imutável. Hashes fora do formato MUST receber `404` sem tocar o disco fora do diretório de assets.

#### Scenario: Asset publicado
- **WHEN** o app baixa um asset listado no manifest
- **THEN** recebe o conteúdo com `cache-control: public, max-age=31536000, immutable`

### Requirement: Publicação autenticada
Publicar SHALL exigir `Authorization: Bearer` igual a `CLAUDE_REMOTE_UPDATES_TOKEN`. O servidor MUST recusar um asset cujo conteúdo não tenha o hash da URL e um manifest sem assinatura, com `runtimeVersion` divergente, com asset ausente ou com URL de asset que não aponte para a rota `assets/<hash>` do próprio hash. A chave privada de assinatura MUST NOT ser necessária no servidor.

#### Scenario: Token errado
- **WHEN** alguém envia um asset sem o token correto
- **THEN** a resposta é `401` e nada é gravado

#### Scenario: Hash divergente
- **WHEN** o corpo de um `PUT` não tem o SHA-256 da URL
- **THEN** a resposta é `400` e nada é gravado

#### Scenario: Recurso desligado
- **WHEN** `CLAUDE_REMOTE_UPDATES_TOKEN` não está configurado
- **THEN** as rotas de publicação respondem `404`
