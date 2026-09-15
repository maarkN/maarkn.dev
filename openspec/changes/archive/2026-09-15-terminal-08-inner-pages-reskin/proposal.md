## Why

As rotas internas (`/projects`, `/projects/[slug]`, `/career`, `/career/[slug]`, `/blog`, `/blog/[slug]`, `/links`) continuam existindo por SEO e por serem o destino de `open`/`read`, mas precisam parecer "arquivos abertos no mesmo terminal" — hoje têm parallax, covers gradientes, Nav/Footer e Framer Motion.

## What Changes

- Novo chrome compartilhado (`PageChrome`: barra de status com caminho, breadcrumb no formato `ps1 + comando`, rodapé mínimo) para todas as rotas internas.
- **BREAKING** Saída de `Nav`, `Footer`, `parallax-cover`, covers gradientes, cards e filtros visuais; conteúdo e rotas preservados.
- `/projects` vira lista no formato do comando `projects` com filtro por categoria via `?cat=`.
- `/career` vira a saída de `experience` com âncoras; detalhes em prosa mono.
- `/blog` vira lista no formato de `writing`; `/blog/[slug]` ganha prosa mono (`.prose-term`) para o HTML do Ghost.
- `/links` vira `cat links.sh`, sem foto.
- Remoção de `framer-motion` e `lucide-react` dessas rotas.

## Capabilities

### New Capabilities
- `terminal-page-chrome`: aparência e comportamento comuns das páginas internas no design terminal (barra, breadcrumb, listas, prosa, rodapé, responsividade) e o que cada rota exibe.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/components/terminal/page-chrome.tsx`, `page-footer.tsx`, `prose.css`; reescrita de `project-detail`, `career-detail`, listagens e `links`; `src/app/[lang]/(pages)/**`.
- Depende de `theme-palette` (01) e dos route groups da 06 (pode começar antes, usando `(pages)` criado aqui se a 06 ainda não tiver mergeado).
