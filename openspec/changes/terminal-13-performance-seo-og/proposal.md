## Why

Trocar a home por um terminal client-side pode degradar Core Web Vitals e indexação se não for medido. Esta change fixa orçamentos, valida SEO e alinha a imagem OG à nova identidade.

## What Changes

- Baseline Lighthouse da versão atual e medição pós-migração, ambas versionadas em `.docs/perf/`.
- Orçamento de JS da home (< 60 kB gz específico), renderer de markdown carregado sob demanda.
- Garantias de LCP (texto SSR), CLS (relógio com largura fixa) e INP.
- Fontes: preload só da fonte padrão; subset latin + latin-ext.
- Sitemap sem `/chat`, `hreflang` em todas as rotas, JSON-LD válido, H1 único.
- Imagem OG/Twitter reestilizada como terminal.

## Capabilities

### New Capabilities
- `site-seo-performance`: orçamentos de desempenho e requisitos de indexação/compartilhamento do site após a migração.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/app/[lang]/opengraph-image.tsx`, `sitemap.ts`, `lib/seo.ts`, `next.config.ts` (build date), carregamento de fontes; `.docs/perf/`.
- Depende de 06, 08, 12.
