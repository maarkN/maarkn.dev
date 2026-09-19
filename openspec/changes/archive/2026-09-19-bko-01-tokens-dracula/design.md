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
  | `--card-foreground` / `--popover-foreground` / `--secondary-foreground` / `--accent-foreground` | `var(--fg)` | texto sobre as superfícies acima: 14.59:1 sobre `--card` e 8.46:1 sobre `--sel` |
  | `--muted-foreground` | `#BABFCC` | `--comment` (#8F93A0) mede 4.64:1 sobre `--bg` mas só 2.98:1 sobre `--sel`; o `#A2A6B3` da change 14 chega a 3.77:1, ainda abaixo de AA. `#BABFCC` mede 7.74 / 8.58 / 4.97 sobre `--bg` / `--card` / `--sel` |
  | `--destructive` | `#F28B8B` | `--red` (#EE6666) mede 4.01:1 sobre `bg-destructive/10` em `--bg` e 4.43:1 em `--card`; `#F28B8B` sobe para 5.04 / 5.58; herdado da change 14 |
  | `--destructive-foreground` | `var(--bg)` | mesma razão de `--primary-foreground` |
  | `--border` | `var(--line)` | separadores decorativos |
  | `--input` | `var(--comment)` | borda de controle precisa de 3:1 (WCAG 1.4.11); `--line` mede 1.25:1 sobre `--bg` e 1.38:1 sobre `--card`, enquanto `--comment` mede 4.64 / 5.15 |
  | `--ring` | `var(--purple)` | |

- **Nada de `dark:`.** O admin é sempre escuro; a `@custom-variant dark` que a F0a trouxe da branch não entra. Qualquer `dark:` remanescente nos primitives vira a variante única.

- **`--radius` vai a `0`.** Correção do que a primeira redação dizia: o token NÃO achata os 20 primitives. Os cantos retos vêm dos `rounded-none` escritos na marcação; `rounded-sm/md/lg` leem `--radius-sm/md/lg`, que o `@theme` não declara, então seguem no default do Tailwind. O único consumidor de `var(--radius)` é o estilo inline de `src/components/ui/sonner.tsx`. Fica em `0` para esse caso; introduzir a escala `--radius-*` (e varrer os 5 `rounded-md` restantes) é decisão da change 03. **Resolvido na bko-03, opção (b):** a escala `--radius-*` NÃO foi introduzida e os 5 `rounded-md` viraram `rounded-none` — o raio do admin é marcação (43 `rounded-none`), não token. `--radius: 0` sobrevive só para o estilo inline de `sonner.tsx`. O motivo está no comentário de `src/app/admin/admin.css`: `@theme` só funciona em `globals.css`, que não importa `admin.css`, então declarar a escala lá faria todo `rounded-*` do repositório emitir `var(--radius-md)` — resolvendo para nada fora de `.admin-root` — em troca de cinco call sites que a própria bko-03 eliminou.

- **Dimmer é escolher cor, não baixar alpha.** Três reprovações de contraste desta change vinham de modificadores de opacidade sobre `--muted-foreground`, e nenhum valor de token as resolve: `text-muted-foreground/70` cai a 4.11:1 numa linha com `hover:bg-muted/50` (o teto para qualquer texto a 70% sobre `--card` é 6.57:1, e a 70%×60% é 3.96:1). Por isso saíram os dois `text-muted-foreground/70` (`kanban-board.tsx`, `jobs/page.tsx`) e o `opacity-60` da linha de vaga encerrada — o badge "Encerrada" já carrega a informação, e a linha continua sendo conteúdo ativo, fora da isenção de 1.4.3.

- **Badges de matiz passam de `text-<hue>-400` para `text-<hue>-300`.** Os 82 pares `bg-<hue>-500/15 text-<hue>-400` foram medidos nas quatro superfícies do admin. Em repouso sobre `--card` só `indigo` reprovava (4.32:1), mas sobre uma linha com `hover:bg-muted/50` reprovavam também `blue` (3.91), `fuchsia` (4.15), `orange` (4.24), `red` (3.79) e `violet` (3.73). O degrau `-300` passa em todas: o pior caso vira 5.30:1 (`indigo` em linha sob hover). Uniforme nos 13 matizes — `slate` e `neutral` já estavam em `-300` —, o que mantém a rampa de luminosidade coerente. É mudança de classe, não de layout; encostou no Non-Goal "não mudar marcação" e está registrado aqui por isso.

- **`--destructive-foreground` está declarado e não tem consumidor.** `button.tsx` e `badge.tsx` usam `bg-destructive/10 text-destructive` (5.58:1 sobre `--card`), não `bg-destructive text-destructive-foreground`. O cenário "Diálogo de confirmação" do spec delta descreve o botão destrutivo com texto `--bg`, que não é o que renderiza. Como trocar a marcação do primitive é Non-Goal, o token fica declarado (custo zero, par válido a 6.00:1) e a divergência spec↔implementação segue aberta para a change 04/05 decidir.

## Risks / Trade-offs

- [Um primitive shadcn usa um token fora do mapa e fica invisível] → inventariar antes de escrever o CSS: `grep -rhoE '(bg|text|border|ring|fill|stroke|from|to)-[a-z-]+' src/components/ui | sort -u`, e conferir que todo nome tem entrada na tabela.
- [`--radius: 0` deixa o Kanban e os badges duros demais] → avaliar na change 03 com o board renderizado; se não sustentar, subir para `2px` apenas em `--radius-sm`.
- [Os valores elevados (`#BABFCC`, `#F28B8B`) são literais fora da paleta] → documentados no CSS com o motivo e o número medido, como a change 14 já fazia; não vira token de paleta para não vazar para o site.
