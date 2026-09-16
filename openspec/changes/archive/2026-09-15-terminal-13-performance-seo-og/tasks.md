## 1. Medições

- [x] 1.1 Rodar Lighthouse mobile na `main` atual (home, projeto, post) e salvar `.docs/perf/baseline-2026-09.json`
- [x] 1.2 Após 12, rodar de novo e salvar `after-terminal.json` + tabela em `.docs/perf/README.md`; verificar limites da spec

## 2. Ajustes

- [x] 2.1 Confirmar `preload` só da Cascadia (subset `latin`, que já cobre os acentos pt-BR — U+00C0–00FF; `latin-ext` não tem glifo usado) e `preload:false` na DaddyTimeMono; verificar aba Network e acentos pt-BR
- [x] 2.2 Confirmar chunk separado do markdown (`next/dynamic`) e medir JS específico da home (< 60 kB gz) via `pnpm build` + análise do bundle; anotar (o zod do `mail` saiu do chunk da home via `import()` dinâmico: 88 → 24 kB gz)
- [x] 2.3 Fixar largura do relógio (`5ch`, `tabular-nums`) e verificar CLS ≤ 0.02 (também: fallback mono com métricas da Cascadia em `globals.css`, que zera o CLS do swap da fonte em rede lenta)

## 3. SEO e OG

- [x] 3.1 Ajustar `sitemap.ts` (sem `/chat`; projetos via `getAllProjects()`, o mesmo loader DB-first das páginas), confirmar `hreflang` e `h1` único em todas as rotas; validar JSON-LD (validator.schema.org: 0 erros, 0 avisos — Person/WebSite não são tipos de rich result, então o Rich Results Test não os reporta); testes unitários `src/lib/seo.test.ts` e `src/app/sitemap.test.ts`
- [x] 3.2 Reestilizar `opengraph-image.tsx` (e twitter, se houver) no estilo terminal com fonte mono e i18n; verificar prévia para `/en` e `/pt-BR`

## 4. Verificação

- [x] 4.1 Lighthouse: Performance ≥ 95, LCP ≤ 2.0s, CLS ≤ 0.02, INP ≤ 200ms, SEO 100, Best Practices 100 na home; `pnpm lint && pnpm build && pnpm test` verdes (cenário "Auditoria local" da spec: LCP 1.53 s com throttling aplicado; o modelo Lantern contra `localhost` dá 2.57 s por construção — números em "Resultados" no `design.md`)

Follow-up fora do escopo do merge (não é tarefa desta change): Lighthouse de produção e Search Console por 7 dias após o deploy, conforme "Follow-up pós-deploy" no `design.md`; registro em `.docs/perf/README.md`.
