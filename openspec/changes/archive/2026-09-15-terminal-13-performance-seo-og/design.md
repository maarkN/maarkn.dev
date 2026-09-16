## Context

Home ISR 1h; Ghost ISR 5min; `opengraph-image.tsx` usa `ImageResponse`. Deploy via Traefik/Docker (`DEPLOY.md`). Ver proposal.md.

## Goals / Non-Goals

**Goals:** números medidos e registrados aqui (seção "Resultados"), com os relatórios completos em `.docs/perf/`; nenhum regresso silencioso — o que dá para testar sem navegador (sitemap, `hreflang`) tem teste unitário.
**Non-Goals:** CDN/edge caching novo; analytics.

## Decisions

- **Baseline antes do merge da 06** medido a partir de `main @ f61396e` e comparado com a árvore final da change. Os relatórios do Lighthouse (`baseline-2026-09.json`, `after-terminal*.json`, `README.md` com as tabelas e `lighthouse.sh`) ficam em `.docs/perf/`, que é local: `/.docs` está no `.gitignore` por decisão do repositório (planejamento não versionado). O que precisa sobreviver ao arquivamento — medianas, limites e o método — está em "Resultados" abaixo.
- **Markdown via `next/dynamic`** no comando `ask` (já previsto na 07) — aqui só se valida o chunk separado.
- **Relógio** com `width: 5ch` e `tabular-nums` para CLS zero.
- **Subset da Cascadia só `latin`**: cobre U+0000–00FF (ã, ç, é, õ…); `latin-ext` (U+0100+) não tem nenhum glifo usado pelo site e custaria 27 KB no caminho do LCP.
- **Fallback com métricas**: o `next/font` só ajusta Arial/Times (proporcionais), e o swap movia o texto em rede lenta (CLS 0.026). `adjustFontFallback: false` + `@font-face "Cascadia Code Fallback"` em `globals.css` com `local()` das monos da plataforma e `size-adjust`/`ascent-override`/`descent-override` derivados da Cascadia (avanço 0.586 em) → CLS 0.
- **zod fora da home**: o `mail` carrega `contact-schema.ts` por `import()` na primeira pergunta; o JS específico da home cai de 88 para 24 kB gz.
- **hreflang por rota**: `routeAlternates(locale, path)` em `lib/seo.ts` (canonical + en/pt-BR/x-default) em todas as páginas; sitemap com projetos, cargos e posts (revalidação 1 h) e sem `/chat`. Os projetos do sitemap vêm de `getAllProjects()` (DB-first, o mesmo loader das páginas — quando o admin tem linhas, a lista do banco substitui o catálogo estático, então sitemap e páginas nunca divergem); cargos vêm do `timeline` estático, como a página. `seo.test.ts` e `sitemap.test.ts` (Ghost e DB mockados) fixam canonical/`hreflang`, os dois idiomas de `/projects`, a ausência de `/chat` e a precedência do banco.
- **OG por rota**: `ImageResponse` renderizado por `src/lib/og.tsx` — barra roxa `maarkn@dev`, `maarkn@dev:~$ <comando>`, título, subtítulo e até três linhas de saída, prompt com cursor. Além de `[lang]/opengraph-image.tsx` (`whoami`, com as linhas do dicionário), cada rota interna tem o seu (`ls projects/`, `cat projects/<slug>.md`, …) com título e idioma da rota. Fonte: subsets Regular/Bold da Cascadia (30 KB `.ttf`, OFL) em `src/app/fonts`, lidos com `readFile` (rastreados no `standalone`). Twitter herda a mesma imagem (`summary_large_image`).
- **Verificação de fontes** pela aba Network e por `document.fonts` em teste manual; sem ferramenta extra.
- **Medição**: `.docs/perf/lighthouse.sh` (3 runs, mediana). Contra `localhost` o modelo Lantern (`simulate`) infla o LCP para ~2.5 s porque os scripts terminam antes do paint; a leitura com throttling aplicado (`devtools`, LCP 1.53 s) reproduz a ordem da rede real. A auditoria que fecha a spec é a de produção.
- **Cache-Control** conferido em produção após o deploy (não é código da app).

## Resultados (2026-09-15, mediana de 3 runs, Lighthouse 12.8.2 mobile, `next start` local)

| home | perf | seo | a11y | bp | LCP | CLS | TBT | JS gz |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline (`main @ f61396e`, simulate) | 90 | 100 | 95 | 100 | 3.69 s | 0 | 40 ms | 237 KB |
| terminal · simulate | 97 | 100 | 100 | 100 | 2.57 s* | 0 | 60 ms | 172 KB |
| terminal · devtools | 96 | 100 | 100 | 100 | 1.53 s | 0 | 70 ms | 172 KB |

\* Lantern contra `localhost` (ver decisão "Medição"); a leitura que vale para a spec é a com throttling aplicado. Projeto e post: perf 97–100 nos dois modos, LCP 1.51 s (devtools).

- Elemento LCP: a linha do `whoami` que já vem no HTML (`<div class="line …">`).
- INP (proxy: pior `event` com CPU 4× via Puppeteer, janela visível): 72 ms; nenhuma long task após o load.
- JS específico da home: 24.2 KB gz (era 88.4 KB antes de tirar o zod do caminho); framework 146.7 KB gz (sem o chunk `noModule`); chunk do markdown (6.4 KB gz) só no primeiro `ask`.
- Fontes: 1 `<link rel="preload">` (Cascadia `latin`, 40 KB woff2); DaddyTimeMono declarada e não baixada; `document.fonts.check("14px 'Cascadia Code'", "ãçéõ")` → true.
- Sitemap: 52 URLs (home, 4 listagens, 8 projetos, 8 cargos, 5 posts × 2 idiomas), sem `/chat`; `hreflang` en/pt-BR/x-default e `h1` único nas 17 URLs públicas; JSON-LD WebSite + Person: 0 erros / 0 avisos no validator.schema.org.
- OG: 10 rotas → 200 `image/png` 1200×630 em 40–260 ms, inclusive no `standalone`.

## Follow-up pós-deploy (fora do escopo do merge)

O cenário "Auditoria pós-migração" da spec só se fecha em produção. Depois do deploy: rodar `.docs/perf/lighthouse.sh prod-<data> https://maarkn.dev 3` (o modelo simulado também vê os scripts terminando depois do paint lá) e acompanhar o Search Console por 7 dias — cobertura sem erros novos, `hreflang` sem "no return tag", sitemap lido com as ~52 URLs, Core Web Vitals de campo sem regressão. Registrar na tabela "Search Console" de `.docs/perf/README.md`. Se o LCP simulado de produção ficar acima de 2.0 s, abrir uma change para reduzir o JS no caminho crítico (não relaxar o limite).

## Risks / Trade-offs

- [Overlay de boot como LCP] → é texto; se o Lighthouse eleger o overlay, ainda cumpre o limite.
- [`.ttf` grande no `ImageResponse`] → usar subset ou peso único (Regular) para a OG.
