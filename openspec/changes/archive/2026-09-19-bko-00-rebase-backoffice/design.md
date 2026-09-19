## Context

`main` = `30fc019` (redesign de terminal, 16 commits sobre `f61396e`). `feat/backoffice-f0-f3` = `00969f1`, um único commit sobre `f61396e` com todo o trabalho não commitado que existia na máquina. Backup completo em `../backup-backoffice-20260917-210033.tar.gz`.

O backoffice nunca foi publicado: a branch é local e a `main` remota não a conhece. Ver proposal.md.

## Goals / Non-Goals

**Goals:** uma `main` que contém as duas linhas de trabalho, com o tema do redesign intacto e o backoffice funcional; base limpa para as changes 01–05.
**Non-Goals:** reestilizar qualquer tela (é o que fazem as changes 01–05); mexer em dados; publicar a branch.

## Decisions

- **Rebase, não merge.** A branch tem um commit só; rebasear produz um histórico linear e um único ponto de conflito. Um merge deixaria um commit de merge com 152 arquivos e um diff ilegível.

- **Regra de resolução por camada**, aplicada arquivo a arquivo:
  - `globals.css` → **vence a `main`**. O bloco `@theme inline` da F0a (tokens shadcn mapeados sobre `--surface`/`--text`/`--accent`) referencia aliases que o redesign apagou; reconstruir isso é o objeto da change 01. Nada da F0a é preservado aqui.
  - `admin/layout.tsx` → **vence a `main`** (`data-theme="soft"` fixo, `admin.css`, sem `ThemeProvider`), acrescentando apenas os providers que o backoffice precisa (`Toaster` do sonner, `TooltipProvider`).
  - `admin/page.tsx`, `admin/applications/page.tsx`, `admin/chat/page.tsx`, `components/admin/*` → **vence a branch**. São telas reescritas pelo backoffice; o que a `main` fez neles foi troca de classe, que as changes 01–04 refazem de propósito.
  - `applications-table.tsx` → a branch **apaga** o arquivo (virou `applications/page.tsx` + `TablePager`). A deleção vence.
  - `src/lib/applications.ts` → **vence a branch** (o arquivo do redesign é o antigo enum; o da branch tem `FUNNEL_STAGES`, `slugPart`, `buildFolderName`).
  - `package.json` / `pnpm-lock.yaml` → **união**. O redesign adicionou vitest e removeu dependências mortas; o backoffice adicionou radix, sonner, `@modelcontextprotocol/sdk`. Resolver no `package.json` e regerar o lock com `pnpm install`, nunca editando o lock à mão.
  - `.env.example`, `docker-compose.prod.yml` → **união manual**; são listas de chaves e serviços, sem sobreposição real.

- **Ordem de verificação depois do rebase**, nesta sequência, porque cada uma só faz sentido se a anterior passou: `pnpm install` → `pnpm lint` → `pnpm build` (sem `DATABASE_URL`, que é como o CI roda) → `pnpm test` (vitest, novo na `main`) → `pnpm prisma migrate deploy` num banco limpo → `pnpm db:seed:demo`.

- **O admin fica quebrado visualmente ao fim desta change, e isso é esperado.** Os primitives shadcn perdem seus tokens quando o bloco da F0a é descartado: `bg-background`, `text-foreground`, `bg-primary` e companhia ficam sem valor. A change 01 é o que os devolve. Não tente consertar aqui — remendar `globals.css` agora significa refazer o trabalho na 01.

## Risks / Trade-offs

- [O `pnpm-lock.yaml` resolvido errado quebra o build de forma difícil de ler] → descartar o lock em conflito por completo (`git checkout --theirs` não serve aqui) e regerar com `pnpm install` a partir do `package.json` já resolvido.
- [O rebase é grande e pode ser abandonado no meio] → o backup em tarball e o commit `00969f1` continuam existindo; `git rebase --abort` volta ao estado anterior sem perda.
- [Janela em que o admin não é usável] → aceita: as changes 01–05 são sequenciais e curtas, e o admin não está em produção com usuários.
