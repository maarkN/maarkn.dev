# Log de resolução do rebase — os 16 arquivos

`git rebase main feat/backoffice-f0-f3`: `00969f1` (152 arquivos, sobre `f61396e`)
reaplicado sobre `28ddc72`, virando **`d864350`** (150 arquivos vs. `main`).

Dos 16 arquivos previstos no proposal, **14 deram conflito real** (13 de conteúdo +
1 modify/delete) e **2 auto-mergearam** — mas os dois auto-merges produziram um
resultado ERRADO pela regra de camada e foram sobrescritos à mão.

| # | Arquivo | Conflito | Resolução | Resultado |
|---|---|---|---|---|
| 1 | `.env.example` | conteúdo | **união** — bloco `UPLOAD_DIR` da `main` + blocos `LOGIN_RATE_*`, MCP (F3) e partição pública/privada do RAG (F7) da branch | 121 linhas, sem sobreposição |
| 2 | `docker-compose.prod.yml` | auto-merge (sobrescrito) | **vence a `main`**. A branch não acrescentou nada de substância: só reformatação do prettier + trocar `${ACME_EMAIL:?set ACME_EMAIL}` por `${ACME_EMAIL:-admin@maarkn.dev}`, que remove a exigência da variável e chumba um e-mail. União ≡ versão da `main` | `git diff main` vazio |
| 3 | `package.json` | conteúdo | **união dos que têm consumidor** (ver Decisão D1) | `db:seed:demo`, `@modelcontextprotocol/sdk`, `class-variance-authority`, `next-themes`, `radix-ui`, `sonner`, `shadcn`, `tw-animate-css` entram; `vitest`/`jsdom`/`lint`+`test` da `main` ficam |
| 4 | `pnpm-lock.yaml` | conteúdo | **descartado** (`git checkout main -- pnpm-lock.yaml`) e regerado com `pnpm install` a partir do `package.json` resolvido. Nunca editado à mão | `pnpm install --frozen-lockfile` → `Already up to date` |
| 5 | `src/app/globals.css` | auto-merge (sobrescrito) | **vence a `main`, integralmente** (`git checkout main -- …`). O `@import "tw-animate-css"`, o `@import "shadcn/tailwind.css"`, o `@custom-variant dark` e o bloco `:root` de ~125 linhas de tokens shadcn da F0a foram DESCARTADOS — é o que a change 01 reconstrói em `admin.css` | `git diff main` vazio ✅ |
| 6 | `src/app/admin/layout.tsx` | conteúdo | **vence a `main`** (`data-theme="soft"` fixo, `import "./admin.css"`, fonte `caskaydia`, sem `ThemeProvider` nem `themeBootScript`), + os dois providers do backoffice: `TooltipProvider` e `Toaster` do sonner. `theme="dark"` fica explícito no `Toaster` porque não há mais `next-themes` provider para ele ler | diff vs `main` = +2 imports, +2 providers |
| 7 | `src/app/admin/page.tsx` | conteúdo | **vence a branch** (`--theirs`) | dashboard do backoffice |
| 8 | `src/app/admin/applications/page.tsx` | conteúdo | **vence a branch** | lista + `TablePager` |
| 9 | `src/app/admin/chat/page.tsx` | conteúdo | **vence a branch** | — |
| 10 | `src/components/admin/application-form.tsx` | conteúdo | **vence a branch** | — |
| 11 | `src/components/admin/applications-table.tsx` | **modify/delete** | **a deleção vence** (`git rm --force`). Virou `applications/page.tsx` + `TablePager` | arquivo não existe mais |
| 12 | `src/components/admin/generator-form.tsx` | conteúdo | **vence a branch** | — |
| 13 | `src/components/admin/login-form.tsx` | conteúdo | **vence a branch** | — |
| 14 | `src/components/admin/logout-button.tsx` | conteúdo | **vence a branch** | — |
| 15 | `src/components/admin/project-form.tsx` | conteúdo | **vence a branch** | — |
| 16 | `src/lib/applications.ts` | conteúdo | **vence a branch** (`FUNNEL_STAGES`, `slugPart`, `buildFolderName`, enums nativos do Postgres) | o `APPLICATION_STATUSES` antigo da `main` sumiu |

## O que a change 01 vai encontrar

- `src/app/globals.css` está **idêntico à `main`**: Dracula puro, zero token shadcn.
- Os 20 primitives em `src/components/ui/*` estão no lugar e compilam, mas
  `bg-background`, `text-foreground`, `bg-primary`, `border-border`, `--radius`
  e companhia **não resolvem para nada**. O admin está visualmente quebrado, e
  isso é o estado esperado ao fim da bko-00.
- `tw-animate-css` está instalado mas **não é importado por ninguém**: os
  utilitários `animate-in` / `slide-in-from-*` que os primitives usam estão
  mortos até a 01 reimportá-lo (provavelmente em `admin.css`).
- `shadcn/tailwind.css` (dos `data-open`/`data-closed`/… variants) também
  perdeu seu `@import` e precisa voltar.
- `src/app/admin/admin.css` (da `main`) segue como o único lugar com aliases de
  tema do admin, escopado em `.admin-root`.
- `src/components/ui/sonner.tsx` ainda importa `useTheme` do `next-themes` sem
  provider em escopo; o `theme="dark"` passado no layout é o que o salva.

## Decisões tomadas que merecem revisão

**D1 — `package.json` é a união dos pacotes COM CONSUMIDOR, não a união literal.**
A `main` removeu `@auth/prisma-adapter`, `framer-motion`, `class-variance-authority`
e `@types/bcryptjs` como dependências mortas. Conferi um a um no código já
rebaseado:

| Pacote | Consumidores após o rebase | Decisão |
|---|---|---|
| `class-variance-authority` | `ui/badge.tsx`, `ui/button.tsx`, `ui/tabs.tsx` | **restaurado** (sem ele o build quebra) |
| `framer-motion` | nenhum — os componentes do site público que o usavam foram apagados pelo redesign | mantido **fora** |
| `@auth/prisma-adapter` | nenhum (`src/lib/auth.ts` usa credentials + JWT) | mantido **fora** |
| `@types/bcryptjs` | nenhum — `bcryptjs@3` já traz os tipos | mantido **fora** |

União literal teria reintroduzido três dependências mortas num repositório
público. Se a intenção era a união literal, isto é o ponto a reverter.

**D2 — `docker-compose.prod.yml` voltou inteiro para a versão da `main`.**
A branch só mexeu nele por reformatação automática, com uma mudança semântica
embutida: `${ACME_EMAIL:?set ACME_EMAIL}` → `${ACME_EMAIL:-admin@maarkn.dev}`.
A forma da `main` falha rápido quando a variável não está setada; a da branch
emitiria certificado Let's Encrypt registrado num e-mail chumbado no código.
Preferi a da `main`. Nada do backoffice foi perdido (ele não adicionou serviço,
volume nem variável ao compose de produção).

**D3 — `TooltipProvider` no layout raiz é redundante hoje.**
`src/components/admin/admin-shell.tsx` já se envolve num `TooltipProvider`
próprio (linha 150). O design.md pede o provider no layout, então ele está lá —
aninhar providers do Radix é inofensivo — e cobre telas fora do `admin-shell`
(ex.: `/admin/login`). Se a 01 preferir um só, o do `admin-shell` é o que sai.

**D4 — a contagem de migrations do tasks.md está errada: são 12, não 13.**
`prisma/migrations/` tem 12 diretórios (6 da `main` + 6 do backoffice) mais o
`migration_lock.toml`. As 12 aplicam em ordem num banco limpo. Nenhuma ação
necessária além de corrigir o número.

**D5 — `.env.example` carrega dados pessoais em comentário, e o repo é público.**
A linha `# Default: <e-mail pessoal>,<telefone pessoal>` (default de
`GENERATOR_OWN_CONTACTS`) veio da branch e agora está no exemplo versionado de
um repositório público. Deixei como estava — mudar isso não é bko-00 — mas é
para tratar antes de qualquer push.

**D6 — linha em branco no fim de `application-detail/dossier-tabs.tsx`.**
`git diff --check` aponta `new blank line at EOF`. É pré-existente em `00969f1`,
não veio da resolução de conflito. Não mexi, para o rebase ficar fiel.
