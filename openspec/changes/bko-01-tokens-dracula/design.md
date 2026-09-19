## Context

Três vocabulários de token disputam o admin depois do rebase:

1. **Paleta** (`--bg`, `--fg`, `--purple`, `--line`, `--sel`, `--comment`, `--red`…), definida em `globals.css` no `:root`, é a verdade do redesign.
2. **Aliases legados** (`--surface`, `--text`, `--accent`…), em `admin.css` sob `.admin-root`, criados pela change 14 só para não reescrever as classes do admin antigo.
3. **Tokens shadcn** (`--background`, `--primary`, `--muted`, `--ring`…), que os 20 primitives de `src/components/ui/**` exigem e que a F0a tinha colocado no `globals.css` da branch.

Ver proposal.md.

## Goals / Non-Goals

**Goals:** um vocabulário de token no admin; primitives shadcn funcionando sobre Dracula; contraste AA preservado.
**Non-Goals:** mudar marcação, layout ou chrome (changes 02–04); tocar no tema do site público.

## Decisions

- **Os `--color-*` ficam em `globals.css`; os valores ficam em `admin.css`.** Tailwind v4 só processa `@theme` no arquivo que tem `@import "tailwindcss"`, e `admin.css` é importado pelo `layout.tsx`, não pelo CSS. Então `globals.css` declara `@theme inline { --color-background: var(--background); … }` e `.admin-root` declara `--background: var(--bg)`. O modificador `inline` é o que faz isso funcionar: a utility emite `var(--background)` em vez de resolver para um literal no build, e a variável resolve no escopo onde a classe é usada.
  - **Vazamento aceito:** as utilities `bg-background`, `text-muted-foreground` etc. passam a existir no site inteiro, resolvendo para nada fora de `.admin-root`. Barrado por convenção, não pelo compilador; a change 05 acrescenta o grep que reprova o uso fora de `src/app/admin` e `src/components/{ui,admin}`.

- **Mapa de tokens** sob `.admin-root`, com os desvios justificados:

  | shadcn | valor | por quê |
  |---|---|---|
  | `--background` / `--foreground` | `var(--bg)` / `var(--fg)` | |
  | `--card` / `--popover` | `var(--bg-dim)` | superfície elevada = a mesma do site |
  | `--primary` | `var(--purple)` | |
  | `--primary-foreground` | `var(--bg)` | **não `#ffffff`**: branco sobre `--purple` é 2.25:1; `--bg` é 6.3:1 |
  | `--secondary` / `--muted` / `--accent` | `var(--sel)` | no vocabulário shadcn os três são *superfícies*, não texto — a confusão que derrubou a F0a |
  | `--muted-foreground` | `#A2A6B3` | `--comment` (#8F93A0) é 4.5:1 sobre `--bg` mas cai a 3.9:1 sobre `--sel`; herdado da change 14 |
  | `--destructive` | `#F28B8B` | `--red` (#EE6666) é 4.0–4.4:1 nas caixas `/10`; herdado da change 14 |
  | `--destructive-foreground` | `var(--bg)` | mesma razão de `--primary-foreground` |
  | `--border` | `var(--line)` | separadores decorativos |
  | `--input` | `var(--comment)` | borda de controle precisa de 3:1 (WCAG 1.4.11); `--line` sobre `--card` é 1.13:1 |
  | `--ring` | `var(--purple)` | |

- **Nada de `dark:`.** O admin é sempre escuro; a `@custom-variant dark` que a F0a trouxe da branch não entra. Qualquer `dark:` remanescente nos primitives vira a variante única.

- **`--radius` vai a `0`.** É a diferença mais barata entre "painel shadcn" e "terminal": cantos retos em todo o admin. Um token, efeito em 20 primitives.

## Risks / Trade-offs

- [Um primitive shadcn usa um token fora do mapa e fica invisível] → inventariar antes de escrever o CSS: `grep -rhoE '(bg|text|border|ring|fill|stroke|from|to)-[a-z-]+' src/components/ui | sort -u`, e conferir que todo nome tem entrada na tabela.
- [`--radius: 0` deixa o Kanban e os badges duros demais] → avaliar na change 03 com o board renderizado; se não sustentar, subir para `2px` apenas em `--radius-sm`.
- [Os valores elevados (`#A2A6B3`, `#F28B8B`) são literais fora da paleta] → documentados no CSS com o motivo e o número de contraste, como a change 14 já fazia; não vira token de paleta para não vazar para o site.
