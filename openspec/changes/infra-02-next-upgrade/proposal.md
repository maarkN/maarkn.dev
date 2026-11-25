## Why

No Next 16.2.4, quem abre uma página com âncora volta para essa âncora em qualquer link posterior para a mesma página: `/en/career#nectar-crm`, um caso e `cd ..` terminam em `/en/career#nectar-crm`. Com o topo novo do site, o mesmo leva a marca a `/en#contact`.

## What Changes

- Atualizar o Next e o `eslint-config-next` para a primeira versão 16 estável em que o defeito não se reproduz.
- Caso de ponta a ponta que segura o comportamento.

**Fora do escopo:** adotar recursos novos da versão; mudar de versão principal; remendar a dependência. Se nenhuma versão 16 estável corrigir, a change para e volta para decisão.

## Capabilities

### New Capabilities
- Nenhuma.

### Modified Capabilities
- `terminal-navigation`: um link sem âncora abre a página sem âncora.

## Impact

- `package.json`, `pnpm-lock.yaml`, `scripts/e2e-site.mjs`; a produção passa a rodar a versão nova.
- **Branch:** main
- **Depende de:** infra-01-pr-checks
