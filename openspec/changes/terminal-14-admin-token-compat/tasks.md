## 1. Isolamento de tokens

- [ ] 1.1 Criar `src/app/admin/admin.css` com os aliases legados sob `.admin-root` e importá-lo em `admin/layout.tsx` com `data-theme="soft"` fixo; verificar que `/admin` ignora `classic` salvo
- [ ] 1.2 Remover referências a `theme-switcher`/temas antigos no admin; verificar `grep -rn "theme" src/app/admin src/components/admin` sem seletor de tema

## 2. Legibilidade

- [ ] 2.1 Revisar inputs/botões/erros dos formulários (borda `--line` visível, foco `--purple`, contraste ≥ 4.5:1) e cores hardcoded; verificar com axe em `/admin/projects/new` e `/admin/login`
- [ ] 2.2 Rotular campos de gradiente de cover como "legacy" no `project-form.tsx`; verificar edição de projeto existente

## 3. Verificação

- [ ] 3.1 Smoke completo: login, CRUD de projeto, aplicações, gerador, log de chat, upload; Lighthouse a11y ≥ 90 em `/admin/login`; `pnpm lint && pnpm build` verdes
