## 1. Camada de token

- [x] 1.1 Inventariar os tokens que os primitives exigem (`grep -rhoE '(bg|text|border|ring)-[a-z-]+' src/components/ui | sort -u`) e conferir que cada um tem linha na tabela do design.md
- [x] 1.2 Declarar os `--color-*` shadcn no `@theme inline` de `globals.css`; verificar que o site público não muda (`git diff` visual em `/`, `/en/projects`)
- [x] 1.3 Reescrever `admin.css`: tokens shadcn sobre a paleta, `--radius: 0`, sem aliases legados; manter os comentários de contraste da change 14

## 2. Remoção dos aliases legados

- [x] 2.1 Reescrever os usos de `--surface`/`--text`/`--accent`/`--border-2` no admin para tokens de paleta; verificar com `grep -rn 'var(--surface\|var(--text-\|var(--bg-low\|var(--border-2\|var(--accent-glow' src/app/admin src/components/admin` vazio
- [x] 2.2 Remover a `@custom-variant dark` e os prefixos `dark:` herdados da branch; verificar `grep -rn 'dark:' src/components/ui src/components/admin` vazio

## 3. Verificação

- [x] 3.1 Contraste: medir os pares do design.md; nenhum abaixo de 4.5:1 para texto e 3:1 para borda de controle.
      Feito por cálculo (luminância relativa WCAG) em vez de axe: axe precisa das rotas autenticadas
      renderizadas, e o cálculo cobre o que o axe não alcança — as quatro superfícies do admin
      (`--background`, `--card`/`--popover`/`--sidebar`, linha sob `hover:bg-muted/50`, `--sel`) e os
      estados de foco/hover. 94 pares medidos, 0 reprovações em par renderizado. Ver design.md.
- [x] 3.2a `pnpm lint && env -u DATABASE_URL pnpm build && pnpm test` verdes: lint 0 erros / 2 warnings
      pré-existentes (`boot-overlay.tsx:82`, `theme-provider.tsx:43`, nenhum dos dois no diff);
      build EXIT=0 com as 18 rotas `/admin` na tabela; testes 20 arquivos / 188 casos.
      Conferido no CSS compilado que `.admin-root` traz `--muted-foreground:#babfcc`, que as 55
      utilities de token shadcn do admin têm regra, e que nenhum token de texto resolve para o mesmo
      valor do token de superfície em que é usado.
- [x] 3.2b Percorrer visualmente as 18 rotas do backoffice procurando elemento invisível.
      Ficou aberta nesta change — 17 das 18 rotas exigem sessão de admin e o agente da bko-01 não
      tinha navegador. Absorvida e fechada pela bko-05, com sessão real: `scripts/a11y-admin-axe.mjs`
      mediu 23 superfícies (as 18 rotas mais os 5 overlays, cada um aberto de fato) em 1440×900 e
      390×844. A regra `color-contrast` do axe é o que detecta texto invisível, e o resultado final
      é zero violação critical/serious nas duas larguras, zero rolagem horizontal e zero gatilho não
      encontrado. O único achado real da varredura (`contacts: target-size`) foi corrigido na bko-05.
