## Why

O app Claude Remote (maarkN/claude-remote#20) recebe atualizações de JavaScript pelo ar com `expo-updates`. No EAS Update a assinatura de código só existe nos planos pagos, e sem assinatura quem controlar o servidor de updates consegue rodar código num app que guarda o token do daemon. O droplet que já serve o maarkn.dev pode implementar o [protocolo Expo Updates](https://docs.expo.dev/technical-specs/expo-updates-1/) sem custo extra. (Issue #4)

## What Changes

- **`GET /api/claude-remote/updates/manifest`**: devolve o update mais recente para `expo-platform` + `expo-runtime-version` (protocolo 1, `multipart/mixed`, com o `expo-signature` gravado na publicação), ou `204` quando não há nenhum.
- **`GET /api/claude-remote/updates/assets/<sha256>`**: assets endereçados pelo SHA-256 (base64url), imutáveis e com cache longo.
- **Publicação** só com `Authorization: Bearer $CLAUDE_REMOTE_UPDATES_TOKEN`: `PUT` de cada asset (o servidor confere o hash) e `POST` do manifest **já assinado** pelo publicador. A chave privada nunca chega ao servidor.
- **Armazenamento** num volume Docker novo (`/data/claude-remote-updates`), sem tabela no Postgres.
- Tudo sob `/api`, que o `src/proxy.ts` já ignora (sem reescrita de locale).

## Capabilities

### New Capabilities
- `claude-remote-updates`: servidor de updates OTA do app Claude Remote.

### Modified Capabilities
<!-- nenhuma -->

## Impact

Rotas novas em `src/app/api/claude-remote/updates/`, módulo `src/lib/claude-remote-updates/`, `Dockerfile` (diretório do volume), `docker-compose.prod.yml` (volume e env), `DEPLOY.md` (variável `CLAUDE_REMOTE_UPDATES_TOKEN`). O publicador fica no repositório do Claude Remote.
