## 1. Estrutura de rotas

- [ ] 1.1 Criar route groups `(terminal)` e `(pages)` sob `src/app/[lang]/`, mover as rotas internas para `(pages)` e verificar que todas as URLs continuam iguais (`pnpm build` lista as rotas)
- [ ] 1.2 Mover a page do terminal para `(terminal)/page.tsx` com `revalidate = 3600` e `generateMetadata` (alternates); apagar `src/app/[lang]/terminal/`; verificar 404 em `/en/terminal`

## 2. Fallback SSR

- [ ] 2.1 Extrair `whoamiLines(dict, data)` puro e criar `ServerWhoami` + `<nav aria-label="sitemap">` renderizados no servidor; verificar `curl -s /en | grep -c 'href="/en/projects'` ≥ 1
- [ ] 2.2 Fazer o hook adotar `initialLines` sem duplicar; verificar executando `help` após hidratar
- [ ] 2.3 Testar com JavaScript desabilitado: MOTD, bio e links visíveis e clicáveis

## 3. Layout, metadata e redirects

- [ ] 3.1 Remover `ChatLauncher`, `DevMarqueeStrip`, `KonamiEgg` do layout (manter `ConsoleEgg`), ajustar `viewport.themeColor` e títulos/descrições em `lib/seo.ts`; verificar `<title>` e JSON-LD no HTML
- [ ] 3.2 Gerar novo set de favicons `>_` mantendo nomes em `public/favicon/` e atualizar `manifest.ts`; verificar ícone na aba e manifest válido no DevTools
- [ ] 3.3 Transformar `/[lang]/chat` em redirect para `/[lang]?cmd=ask`, tratar `?cmd=ask` pré-preenchendo o prompt e remover `/chat` do `sitemap.ts`; verificar redirect e sitemap

## 4. Verificação

- [ ] 4.1 Lighthouse mobile na home: LCP < 2.5s, CLS < 0.1, SEO 100 (registrar em `.docs/perf/`)
- [ ] 4.2 `pnpm lint && pnpm build` verdes; smoke de todas as rotas públicas
