## Why

O app Claude Remote ganha um seletor de canal de atualização (`production`/`development`) e o CI do repositório publica em `development` a cada merge (maarkN/claude-remote#33). O servidor precisa separar os updates por canal e impedir que o token guardado no CI publique em produção. (Issue #7)

## What Changes

- Canal pelo header `expo-channel-name` (padrão `production`); manifests em `manifests/<channel>/<platform>/<runtime>/`. Os já publicados (`manifests/<platform>/<runtime>/`) continuam valendo como `production`.
- `POST /manifests` recebe `channel` (padrão `production`).
- Novo `CLAUDE_REMOTE_UPDATES_DEV_TOKEN`: publica só em `development` (403 nos outros canais). `CLAUDE_REMOTE_UPDATES_TOKEN` segue publicando em qualquer canal. Assets continuam compartilhados e aceitam os dois tokens.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `claude-remote-updates`: canais e token restrito a `development`.

## Impact

`src/lib/claude-remote-updates/` (protocolo, armazenamento, token), rotas `manifest` e `manifests`, `DEPLOY.md`. Sem migração: o layout antigo é lido como `production`.
