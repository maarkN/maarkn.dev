## 1. Chrome compartilhado

- [ ] 1.1 Criar `page-chrome.tsx` (StatusBar com `path`, `Breadcrumb` ps1+comando), `page-footer.tsx` e `prose.css` (`.prose-term`); verificar em uma rota de teste nas duas paletas
- [ ] 1.2 Aplicar o chrome no layout do grupo `(pages)` e remover `Nav`/`Footer` das pages; verificar que nenhuma rota interna importa `nav.tsx`/`footer.tsx`

## 2. Rotas (um commit por rota)

- [ ] 2.1 `/links` → `cat links.sh` (sem foto); verificar seis canais + status e ausência de `framer-motion`
- [ ] 2.2 `/blog` (lista via `writingLines`) e `/blog/[slug]` (`.prose-term`, tempo de leitura, data); verificar post com h2/código/citação/lista/imagem nas duas paletas e em 390px
- [ ] 2.3 `/career` (via `experienceLines`, âncoras por slug) e `/career/[slug]` (tabela + prosa, `cd ..`); verificar `/en/career#<slug>` rolando até a posição
- [ ] 2.4 `/projects` (via `projectsLines`, filtro `?cat=` no servidor) e `/projects/[slug]` (metadados, prosa, galeria simples, `private repo`); verificar `?cat=ai` e projeto privado

## 3. Verificação

- [ ] 3.1 Diff de texto renderizado antes/depois (`curl | html2text`) para uma rota de cada tipo salvo em `.docs/design/compare/`; verificar equivalência de conteúdo e metadata (`title`, `description`, `alternates`)
- [ ] 3.2 `grep -rln "framer-motion\|lucide-react" src/app/[lang]/(pages) src/components/terminal` vazio; Lighthouse a11y ≥ 95 em `/en/blog/<slug>` e `/en/projects/<slug>`; `pnpm lint && pnpm build` verdes
