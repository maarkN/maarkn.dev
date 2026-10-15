## Context

`expo-updates` (SDK 57) consulta `updates.url` com os headers `expo-protocol-version: 1`, `expo-platform`, `expo-runtime-version` e, quando o build tem certificado, `expo-expect-signature`. Ele aceita `multipart/mixed` com uma parte `manifest` cujo header `expo-signature` assina exatamente os bytes da parte (RSA-SHA256, `keyid`). Os assets são baixados pelas URLs do manifest e conferidos pelo `hash` (SHA-256 base64url).

## Goals / Non-Goals

**Goals:** servir updates assinados para iOS e Android, publicar sem acesso SSH ao droplet, nenhum segredo de assinatura no servidor.

**Non-Goals:** canais, rollout gradual, painel no admin, rollback por diretiva (republicar um bundle antigo gera um update novo e resolve).

## Decisions

- **Manifest assinado na publicação.** O publicador monta o manifest (com as URLs finais dos assets), assina a string com a chave privada local e envia `{ platform, runtimeVersion, manifest, signature }`. O servidor guarda a string intacta e a devolve byte a byte; ele só valida a forma (JSON, `id` UUID, `runtimeVersion` igual ao do corpo, todos os assets já presentes e com URL terminando em `/api/claude-remote/updates/assets/<hash>` do próprio asset). Um servidor comprometido não consegue gerar assinatura válida.
- **Assets endereçados por conteúdo.** Caminho `assets/<sha256-base64url>`, gravado só se o hash do corpo bater; `HEAD` deixa o publicador pular o que já existe; o `content-type` vai num arquivo ao lado. Arquivo imutável → `cache-control: public, max-age=31536000, immutable`.
- **Sistema de arquivos, não Postgres.** `manifests/<platform>/<runtimeVersion>/<createdAt>-<id>.json`; o mais recente é o último em ordem lexicográfica (prefixo ISO compacto). Escrita atômica (arquivo temporário + `rename`). Sem migração e fácil de apagar; perder o volume só exige republicar.
- **Token de publicação** comparado com `timingSafeEqual` sobre os SHA-256 do esperado e do recebido (tamanhos iguais). Sem `CLAUDE_REMOTE_UPDATES_TOKEN`, publicar responde 404 (recurso desligado).
- **Validação de entrada**: `platform` ∈ {ios, android}; `runtimeVersion` em `^[\w.-]{1,128}$`; hash em `^[A-Za-z0-9_-]{43}$` (evita path traversal); limite de 50 MB por asset e 1 MB por manifest.
- **Negociação**: `multipart/mixed` quando aceito (padrão do cliente); senão `application/expo+json`/`application/json` com o `expo-signature` no header da resposta. `expo-protocol-version` diferente de `1` → 406. Respostas com `expo-protocol-version: 1`, `expo-sfv-version: 0` e `cache-control: private, max-age=0`.

## Risks / Trade-offs

- O volume não entra no `pg_dump` do deploy → aceitável: os bundles saem do repositório e podem ser republicados.
- Bundles de ~9 MB passam pelo Next (`arrayBuffer`) → só na publicação, autenticada.
- O deploy precisa estar funcionando (hoje falha no `git fetch` do runner por falta da deploy key).
