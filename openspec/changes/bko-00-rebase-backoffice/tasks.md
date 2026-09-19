## 1. Rebase

- [ ] 1.1 Conferir que o backup existe e que `00969f1` está íntegro (`git show --stat 00969f1 | tail -3`) antes de começar
- [ ] 1.2 `git rebase main feat/backoffice-f0-f3` e resolver os 16 conflitos pela regra de camada do design.md; verificar com `git diff --check` e `grep -rn '<<<<<<<' src/`
- [ ] 1.3 Descartar o `pnpm-lock.yaml` em conflito e regerar com `pnpm install` a partir do `package.json` resolvido; verificar que `pnpm install --frozen-lockfile` passa em seguida
- [ ] 1.4 Confirmar que `src/app/globals.css` ficou idêntico ao da `main` (`git diff main -- src/app/globals.css` vazio)

## 2. Verificação funcional

- [ ] 2.1 `pnpm lint` e `env -u DATABASE_URL pnpm build` verdes; anotar a contagem de warnings para comparar com a linha de base (7 na branch, antes do rebase)
- [ ] 2.2 `pnpm test` verde (vitest chegou com o redesign; o backoffice nunca rodou com ele)
- [ ] 2.3 Num banco limpo: `pnpm prisma migrate deploy` aplica as 13 migrations em ordem, depois `pnpm db:seed:demo` popula sem erro; verificar 35 candidaturas e 0 linhas `public` fora dos 12 chunks de `cv.md`
- [ ] 2.4 Smoke do site público: `/`, `/en/projects`, `/en/blog/<slug>` continuam com o terminal intacto — o rebase não pode ter tocado neles

## 3. Fechamento

- [ ] 3.1 Fast-forward da `main` para a branch rebaseada; não publicar ainda (as changes 01–05 deixam o admin apresentável antes de qualquer push)
- [ ] 3.2 Registrar no `openspec/changes/.../00.../` o que foi resolvido em cada um dos 16 arquivos, para a change 01 saber o que encontrou
