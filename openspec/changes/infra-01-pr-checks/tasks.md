## 1. Pré-condições

- [ ] 1.1 Confirmar que `deploy.yml` segue sem `pull_request` e que nenhum outro workflow usa `self-hosted` (`grep -rn "self-hosted\|pull_request" .github/workflows`)

## 2. Workflow de PR

- [ ] 2.1 Criar `pr.yml` disparado por `pull_request` para `main` e `feat/rebranding`, em `ubuntu-latest`, com `permissions: contents: read` e sem `secrets`; verificar abrindo um PR de teste
- [ ] 2.2 Rodar lint, testes, build sem `DATABASE_URL` e `openspec validate --all --strict`; verificar que um PR com dicionário fora de paridade falha
- [ ] 2.3 Comentar no arquivo por que ele é separado do deploy e por que nunca usa o runner próprio; verificar na revisão

## 3. Ponta a ponta

- [ ] 3.1 Criar `scripts/e2e-site.mjs` com o arcabouço (abrir, rolar, asserções, relatório) e um caso que percorre a home atual; verificar com `node scripts/e2e-site.mjs` contra `pnpm start`
- [ ] 3.2 Documentar o script nos dois READMEs; verificar pela leitura

## 4. Fechamento

- [ ] 4.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
