## Context

Componentes atuais: `project-detail.tsx` (328 l., parallax/gallery/pills), `career-stream.tsx` (406 l.), `career-detail.tsx`, `post-content.tsx` (Inter editorial), `links-hub.tsx`, `projects-filter.tsx`, `nav.tsx`, `footer.tsx`, todos com `framer-motion`/`lucide-react`. Ver proposal.md.

## Goals / Non-Goals

**Goals:** um único chrome; zero framer/lucide nessas rotas; paridade de conteúdo e metadata.
**Non-Goals:** OG image (13), deep-link de volta com estado (09), admin (14).

## Decisions

- **`PageChrome`** compõe `StatusBar` (change 02) com prop `path` e `Breadcrumb` (`ps1 + comando`); `PageFooter` com 4 links em `comment`. Layout do grupo `(pages)` aplica o chrome para todas as rotas, evitando repetição por page.
- **Listagens reutilizam as funções puras dos comandos** (`projectsLines`, `experienceLines`, `writingLines` da change 04) renderizadas no servidor — mesma aparência do terminal e nenhuma lógica duplicada. Filtro `?cat=` aplicado no servidor antes de chamar `projectsLines`.
- **`Prose`**: CSS scoped `.prose-term` para o HTML do Ghost (`h2::before{content:"## "}`, `pre{background:var(--bg-dim)}`, `blockquote{border-left:2px solid var(--comment)}`, `img{max-width:100%}`), sem plugin de tipografia.
- **Galeria** vira `<figure>` simples; `parallax-cover.tsx` não é usado. Fotos de perfil não aparecem em nenhuma rota (a identidade é o prompt).
- **Ordem de migração** `links → blog → career → projects` (crescente em complexidade), um commit por rota, para reduzir risco de regressão.
- **Ícones** substituídos por glifos de texto (`↗`, `●`, `›`).

## Risks / Trade-offs

- [Perda dos covers estilizados que davam identidade aos cards] → decisão de design consciente; o `neofetch`/prompt viram a identidade.
- [HTML do Ghost com classes próprias (`kg-*`)] → cobrir os cards mais comuns (`kg-image-card`, `kg-code-card`, `kg-bookmark-card`) no `.prose-term`; demais degradam para HTML padrão.
- [Filtro por `?cat=` em página ISR] → usar `searchParams` (dinâmico) apenas em `/projects`; demais permanecem estáticas.
