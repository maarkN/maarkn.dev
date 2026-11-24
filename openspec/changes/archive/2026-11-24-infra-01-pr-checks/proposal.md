## Why

O rebranding vai viver em `feat/rebranding`, com um PR por change. Hoje PR nenhum roda verificação: o `deploy.yml` só dispara em push para a `main`, porque usa o runner próprio e o repositório é público. Sem rede, erro de tipo, dicionário fora de paridade ou teste quebrado só aparecem no deploy.

## What Changes

- Novo workflow de PR, em runner do GitHub, sem segredos e só com permissão de leitura: instala, `pnpm lint`, `pnpm test`, `pnpm build` sem banco e `openspec validate --all --strict`.
- O `deploy.yml` não muda. Nenhum workflow novo usa `self-hosted`.
- As verificações de ponta a ponta de `docs/design/verificacoes.md` ganham um script no repositório (`scripts/e2e-site.mjs`), no mesmo molde dos scripts de acessibilidade, para as changes `rebrand-*` ampliarem.

**Fora do escopo:** rodar os testes de ponta a ponta no CI (dependem de navegador com GPU) e mudar o deploy.

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- `.github/workflows/pr.yml`, `scripts/e2e-site.mjs`, `package.json` (script), `README.md` e `README.pt-BR.md`.
- **Branch:** main
- **Depende de:** nenhuma
