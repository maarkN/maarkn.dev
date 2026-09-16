## 1. Inventário

- [x] 1.1 Rodar `pnpm dlx knip` e cruzar com a lista do proposal; salvar relatório em `.docs/cleanup/knip-before.txt`

## 2. Remoções (um commit por grupo)

- [x] 2.1 Apagar componentes órfãos de `src/components/`; verificar `pnpm build` e smoke das rotas públicas + admin
- [x] 2.2 Apagar rotas/arquivos residuais (`chat/page.tsx` → `route.ts` de redirect) e assets órfãos (`public/photos`, SVGs boilerplate); verificar build
- [x] 2.3 Remover `framer-motion`, `lucide-react`, `class-variance-authority` conforme `knip`; `pnpm install` e verificar `grep -rn framer-motion src` vazio e build verde
- [x] 2.4 Enxugar `globals.css` (< 300 linhas; tokens legados só em `admin.css`); verificar visual do terminal, páginas internas e admin
- [x] 2.5 Podar chaves de dicionário órfãs e adicionar `scripts/check-dictionaries.ts` ao `pnpm lint`; verificar paridade en/pt-BR

## 3. Verificação

- [x] 3.1 `pnpm dlx knip` sem órfãos em `src/` (relatório em `.docs/cleanup/knip-after.txt`); tamanho do bundle da home antes/depois anotado em `.docs/perf/README.md` — além dos arquivos, `knip` listou 32 exports + 8 tipos exportados sem consumidor externo: os usados só no próprio arquivo perderam o `export`, os mortos (`K`, `resetRouteMemory`, `statusLabel`, `sourceLabel`, `getAllSlugs`, `featuredProjects`) foram apagados; `knip.json` ignora `server-only` (fornecido pelo Next)
- [x] 3.2 `rm -rf .next && pnpm lint && pnpm test && pnpm build` verdes; smoke completo (público + admin)
