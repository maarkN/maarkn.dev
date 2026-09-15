## 1. Inventário

- [ ] 1.1 Rodar `pnpm dlx knip` e cruzar com a lista do proposal; salvar relatório em `.docs/cleanup/knip-before.txt`

## 2. Remoções (um commit por grupo)

- [ ] 2.1 Apagar componentes órfãos de `src/components/`; verificar `pnpm build` e smoke das rotas públicas + admin
- [ ] 2.2 Apagar rotas/arquivos residuais (`chat/page.tsx` → `route.ts` de redirect) e assets órfãos (`public/photos`, SVGs boilerplate); verificar build
- [ ] 2.3 Remover `framer-motion`, `lucide-react`, `class-variance-authority` conforme `knip`; `pnpm install` e verificar `grep -rn framer-motion src` vazio e build verde
- [ ] 2.4 Enxugar `globals.css` (< 300 linhas; tokens legados só em `admin.css`); verificar visual do terminal, páginas internas e admin
- [ ] 2.5 Podar chaves de dicionário órfãs e adicionar `scripts/check-dictionaries.ts` ao `pnpm lint`; verificar paridade en/pt-BR

## 3. Verificação

- [ ] 3.1 `pnpm dlx knip` sem órfãos em `src/` (relatório em `.docs/cleanup/knip-after.txt`); tamanho do bundle da home antes/depois anotado em `.docs/perf/README.md`
- [ ] 3.2 `rm -rf .next && pnpm lint && pnpm test && pnpm build` verdes; smoke completo (público + admin)
