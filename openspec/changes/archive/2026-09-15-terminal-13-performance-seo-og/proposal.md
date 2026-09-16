## Why

Trocar a home por um terminal client-side pode degradar Core Web Vitals e indexação se não for medido. Esta change fixa orçamentos, valida SEO e alinha a imagem OG à nova identidade.

## What Changes

- Baseline Lighthouse da versão atual e medição pós-migração. Os relatórios completos ficam em `.docs/perf/` (pasta local, ignorada pelo git); os números que fecham a spec são registrados em `design.md` (versionado e arquivado com a change).
- Orçamento de JS da home (< 60 kB gz específico), renderer de markdown carregado sob demanda.
- Garantias de LCP (texto SSR), CLS (relógio com largura fixa) e INP.
- Fontes: preload só da fonte padrão; subset `latin` (cobre os acentos pt-BR; `latin-ext` não tem glifo usado pelo site).
- Sitemap sem `/chat` (projetos pelo mesmo loader DB-first das páginas), `hreflang` em todas as rotas, JSON-LD válido, H1 único; testes unitários de `routeAlternates` e do sitemap.
- Imagem OG/Twitter reestilizada como terminal, por rota e no idioma da rota.

## Capabilities

### New Capabilities
- `site-seo-performance`: orçamentos de desempenho e requisitos de indexação/compartilhamento do site após a migração.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/lib/og.tsx` e os `opengraph-image.tsx` de cada rota, `sitemap.ts`, `lib/seo.ts`, `next.config.ts` (build date), `fonts.ts`/`globals.css` (fallback com métricas), `mail-command.tsx` (zod sob demanda); `.docs/perf/` (local).
- Acompanhamento pós-deploy (Search Console, Lighthouse de produção) fica fora do escopo do merge — ver "Follow-up pós-deploy" em `design.md`.
- Depende de 06, 08, 12.
