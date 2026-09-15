## 1. Chrome compartilhado

- [x] 1.1 Criar `page-chrome.tsx` (StatusBar com `path`, `Breadcrumb` ps1+comando), `page-footer.tsx` e `prose.css` (`.prose-term`); verificar em uma rota de teste nas duas paletas
- [x] 1.2 Aplicar o chrome no layout do grupo `(pages)` e remover `Nav`/`Footer` das pages; verificar que nenhuma rota interna importa `nav.tsx`/`footer.tsx`

## 2. Rotas (um commit por rota)

<!-- `projectsLines`/`experienceLines`/`writingLines` criadas em `src/lib/terminal/listings.tsx` (a 04 ainda não existia); ver design.md -->

- [x] 2.1 `/links` → `cat links.sh` (sem foto); verificar seis canais + status e ausência de `framer-motion`
- [x] 2.2 `/blog` (lista via `writingLines`) e `/blog/[slug]` (`.prose-term`, tempo de leitura, data); verificar post com h2/código/citação/lista/imagem nas duas paletas e em 390px
- [x] 2.3 `/career` (via `experienceLines`, âncoras por slug) e `/career/[slug]` (tabela + prosa, `cd ..`); verificar `/en/career#<slug>` rolando até a posição
- [x] 2.4 `/projects` (via `projectsLines`, filtro `?cat=` no servidor) e `/projects/[slug]` (metadados, prosa, galeria simples, `private repo`); verificar `?cat=ai` e projeto privado

## 3. Verificação

- [x] 3.1 Diff de texto renderizado antes/depois (`curl | html2text`) para uma rota de cada tipo salvo em `.docs/design/compare/`; verificar equivalência de conteúdo e metadata (`title`, `description`, `alternates`)
- [x] 3.2 `grep -rln "framer-motion\|lucide-react" src/app/[lang]/(pages) src/components/terminal` vazio; Lighthouse a11y ≥ 95 em `/en/blog/<slug>` e `/en/projects/<slug>`; `pnpm lint && pnpm build` verdes
