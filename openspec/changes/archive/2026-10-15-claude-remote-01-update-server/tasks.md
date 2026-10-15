## 1. Servidor

- [x] 1.1 `src/lib/claude-remote-updates/` (protocolo, validação, armazenamento, token); testes Vitest
- [x] 1.2 Rotas `manifest`, `assets/[hash]` (GET/HEAD/PUT) e `manifests` (POST); testes dos handlers
- [x] 1.3 Volume, env e `Dockerfile`; `DEPLOY.md`

## 2. Verificação

- [x] 2.1 `pnpm lint`, `pnpm test`, `pnpm build`
- [x] 2.2 Ponta a ponta local: publicar com o script do Claude Remote em `next start` e conferir manifest, assinatura e assets (feito: iOS e Android publicados, assinatura válida pelo certificado, hashes e cache dos assets conferidos)
