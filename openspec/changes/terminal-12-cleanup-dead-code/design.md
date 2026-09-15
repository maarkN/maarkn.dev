## Context

`framer-motion` aparece em 18 arquivos; `globals.css` tem 893 linhas com blocos `hero-rise`, scanlines, grid, `dev-*`. Ver proposal.md.

## Goals / Non-Goals

**Goals:** zero órfãos detectáveis por ferramenta; bundle menor; dicionários íntegros.
**Non-Goals:** refatorar o que fica; migrar schema Prisma (campos de cover permanecem).

## Decisions

- **`knip`** como detector de arquivos/exports/dependências não usados (rodado via `pnpm dlx`, não adicionado como dependência). Alternativa: `ts-prune` — só exports; `knip` cobre deps e arquivos.
- **Ordem de remoção em commits separados**: componentes → rotas → assets → dependências → CSS → dicionários, cada um com `pnpm build` verde, para bisect fácil.
- **Script `scripts/check-dictionaries.ts`** compara chaves recursivamente entre `en.json` e `pt-BR.json` e falha no `pnpm lint`.
- **Tokens legados** removidos de `globals.css` apenas depois da change 14 mover o admin para `admin.css`.

## Risks / Trade-offs

- [Remover algo ainda importado pelo admin] → `knip` + smoke do admin antes de cada commit de remoção.
- [Cache do Next com referências antigas] → `rm -rf .next` antes do build final.
