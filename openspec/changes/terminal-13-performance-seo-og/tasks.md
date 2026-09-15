## 1. Medições

- [ ] 1.1 Rodar Lighthouse mobile na `main` atual (home, projeto, post) e salvar `.docs/perf/baseline-2026-09.json`
- [ ] 1.2 Após 12, rodar de novo e salvar `after-terminal.json` + tabela em `.docs/perf/README.md`; verificar limites da spec

## 2. Ajustes

- [ ] 2.1 Confirmar `preload` só da Cascadia (subsets latin+latin-ext) e `preload:false` na DaddyTimeMono; verificar aba Network e acentos pt-BR
- [ ] 2.2 Confirmar chunk separado do markdown (`next/dynamic`) e medir JS específico da home (< 60 kB gz) via `pnpm build` + análise do bundle; anotar
- [ ] 2.3 Fixar largura do relógio (`5ch`, `tabular-nums`) e verificar CLS ≤ 0.02

## 3. SEO e OG

- [ ] 3.1 Ajustar `sitemap.ts` (sem `/chat`), confirmar `hreflang` e `h1` único em todas as rotas; validar JSON-LD no Rich Results Test
- [ ] 3.2 Reestilizar `opengraph-image.tsx` (e twitter, se houver) no estilo terminal com fonte mono e i18n; verificar prévia para `/en` e `/pt-BR`

## 4. Verificação

- [ ] 4.1 Lighthouse: Performance ≥ 95, LCP ≤ 2.0s, CLS ≤ 0.02, INP ≤ 200ms, SEO 100, Best Practices 100 na home; `pnpm lint && pnpm build` verdes
- [ ] 4.2 Acompanhar Search Console por 7 dias após o deploy (não bloqueia o merge; registrar em `.docs/perf/README.md`)
