## 1. Camada de token

- [ ] 1.1 Inventariar os tokens que os primitives exigem (`grep -rhoE '(bg|text|border|ring)-[a-z-]+' src/components/ui | sort -u`) e conferir que cada um tem linha na tabela do design.md
- [ ] 1.2 Declarar os `--color-*` shadcn no `@theme inline` de `globals.css`; verificar que o site público não muda (`git diff` visual em `/`, `/en/projects`)
- [ ] 1.3 Reescrever `admin.css`: tokens shadcn sobre a paleta, `--radius: 0`, sem aliases legados; manter os comentários de contraste da change 14

## 2. Remoção dos aliases legados

- [ ] 2.1 Reescrever os usos de `--surface`/`--text`/`--accent`/`--border-2` no admin para tokens de paleta; verificar com `grep -rn 'var(--surface\|var(--text-\|var(--bg-low\|var(--border-2\|var(--accent-glow' src/app/admin src/components/admin` vazio
- [ ] 2.2 Remover a `@custom-variant dark` e os prefixos `dark:` herdados da branch; verificar `grep -rn 'dark:' src/components/ui src/components/admin` vazio

## 3. Verificação

- [ ] 3.1 Contraste: medir os pares do design.md com axe em `/admin`, `/admin/applications`, `/admin/projects/new` e `/admin/login`; nenhum abaixo de 4.5:1 para texto e 3:1 para borda de controle
- [ ] 3.2 Percorrer as 18 rotas do backoffice procurando elemento invisível (texto na cor do fundo, borda sumida); `pnpm lint && env -u DATABASE_URL pnpm build && pnpm test` verdes
