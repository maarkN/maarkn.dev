## Why

Depois da migração, README, PRD e instruções para agentes ainda descrevem o site antigo (Hero, Big Numbers, três temas, chat flutuante). Documentação desatualizada gera retrabalho — inclusive para os agentes de código que operam neste repo.

## What Changes

- README (en e pt-BR) reescritos: terminal, comandos, `ask`, `mail`, paletas/fontes, rotas internas, admin, novas envs, screenshots/GIF.
- PRD externo (`../PRD_Portfolio_maarkn.md`) para v2.0 com Fase 8 — Terminal e estrutura de projeto atualizada.
- `.docs/design/tokens.md` e `.docs/design/commands.md` (spec de cada comando) como referência local.
- `AGENTS.md`/`CLAUDE.md` com as regras do terminal (sem innerHTML; conteúdo vem de `lib/`).
- `DEPLOY.md` com nova env e pasta `public/fonts`; `CHANGELOG.md` com `2.0.0 — terminal`.
- `.docs/tasks/terminal-migration/00-README.md` fechado com status e links dos PRs.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
<!-- nenhuma -->

`skip_specs: true` — apenas documentação; nenhum comportamento do sistema muda.

## Impact

- `README.md`, `README.pt-BR.md`, `AGENTS.md`, `CLAUDE.md`, `DEPLOY.md`, `CHANGELOG.md`, `.env.example`, `.docs/**`, PRD fora do repo.
- Depende de todas as changes anteriores.
