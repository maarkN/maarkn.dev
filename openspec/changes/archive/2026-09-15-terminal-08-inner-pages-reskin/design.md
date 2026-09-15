## Context

Componentes atuais: `project-detail.tsx` (328 l., parallax/gallery/pills), `career-stream.tsx` (406 l.), `career-detail.tsx`, `post-content.tsx` (Inter editorial), `links-hub.tsx`, `projects-filter.tsx`, `nav.tsx`, `footer.tsx`, todos com `framer-motion`/`lucide-react`. Ver proposal.md.

## Goals / Non-Goals

**Goals:** um único chrome; zero framer/lucide nessas rotas; paridade de conteúdo e metadata.
**Non-Goals:** OG image (13), deep-link de volta com estado (09), admin (14).

## Decisions

- **`PageChrome`** compõe `StatusBar` (change 02) com prop `path` e `Breadcrumb` (`ps1 + comando`); `PageFooter` com 4 links em `comment`. Layout do grupo `(pages)` aplica o chrome para todas as rotas, evitando repetição por page.
- **Listagens reutilizam funções puras** `projectsLines`, `experienceLines`, `writingLines` renderizadas no servidor — mesma aparência do terminal e nenhuma lógica duplicada. Como a change 04 ainda não existia quando esta foi implementada, as funções vivem em `src/lib/terminal/listings.tsx` (client-safe, entradas serializáveis); os comandos `projects`/`experience`/`writing` da 04 devem importá-las daí em vez de reimplementar. Filtro `?cat=` aplicado no servidor antes de chamar `projectsLines`; valor desconhecido = sem filtro.
- **Chrome derivado do pathname**: layouts não recebem `pathname`/`searchParams` no App Router, então `PageChrome` é client component com `usePathname()` e `describeRoute()` (`route-chrome.ts`, puro) resolve `path`, comando do breadcrumb e alvo do `cd ..` (detalhe → listagem; listagem → `/{lang}?cmd=<comando>`). `StatusBar` ganhou a prop opcional `path`, visível também no mobile (`.barPath`).
- **Route group `(pages)`** criado aqui (a 06 ainda não mergeou) só com as sete rotas internas; `chat/`, `terminal/` e a home ficam fora, para a 06 mover como planejado.
- **Dicionário**: novas chaves em `terminal.pages.*` (rótulos das tabelas, cabeçalhos das listas, `cd ..`, links do detalhe) e `links.links.instagram`; status/categorias reutilizam `projects.statuses`/`projects.categories`. `site.cvPath` adicionado (igual ao previsto na 04).
- **`Prose`**: CSS scoped `.prose-term` para o HTML do Ghost (`h2::before{content:"## "}`, `pre{background:var(--bg-dim)}`, `blockquote{border-left:2px solid var(--comment)}`, `img{max-width:100%}`), sem plugin de tipografia.
- **Galeria** vira `<figure>` simples; `parallax-cover.tsx` não é usado. Fotos de perfil não aparecem em nenhuma rota (a identidade é o prompt).
- **Ordem de migração** `links → blog → career → projects` (crescente em complexidade), um commit por rota, para reduzir risco de regressão.
- **Ícones** substituídos por glifos de texto (`↗`, `●`, `›`).
- **Metadata**: títulos/descrições mantidos; única exceção é a descrição de `/career`, que citava o "vertical parallax" removido e foi reescrita com o mesmo sentido.

## Risks / Trade-offs

- [Perda dos covers estilizados que davam identidade aos cards] → decisão de design consciente; o `neofetch`/prompt viram a identidade.
- [HTML do Ghost com classes próprias (`kg-*`)] → cobrir os cards mais comuns (`kg-image-card`, `kg-code-card`, `kg-bookmark-card`) no `.prose-term`; demais degradam para HTML padrão.
- [Filtro por `?cat=` em página ISR] → usar `searchParams` (dinâmico) apenas em `/projects`; demais permanecem estáticas.
- [Contraste de `--comment` (≈3.6:1) reprova o audit `color-contrast`] → Lighthouse a11y fica em 96 nas duas rotas medidas; a correção do token é decisão da change 11.
- [Componentes antigos (`project-detail`, `career-*`, `links-hub`, `post-*`, `projects-filter`, `nav`/`footer` nas páginas) ficam órfãos] → removidos pela change 12 (knip), não aqui.
