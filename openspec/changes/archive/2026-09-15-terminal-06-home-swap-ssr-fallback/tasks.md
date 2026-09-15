## 1. Estrutura de rotas

- [x] 1.1 Criar route groups `(terminal)` e `(pages)` sob `src/app/[lang]/`, mover as rotas internas para `(pages)` e verificar que todas as URLs continuam iguais (`pnpm build` lista as rotas) — `(pages)` já existia (change 08); criado `(terminal)/layout.tsx` com o marcador `data-terminal-route` que trava o documento via CSS. `pnpm build` lista `/[lang]`, `/[lang]/{blog,career,links,projects,chat}` inalterados
- [x] 1.2 Mover a page do terminal para `(terminal)/page.tsx` com `revalidate = 3600` e `generateMetadata` (alternates); apagar `src/app/[lang]/terminal/`; verificar 404 em `/en/terminal` — `next start`: `/en` e `/pt-BR` 200 com o terminal, `/en/terminal` e `/pt-BR/terminal` 404

## 2. Fallback SSR

- [x] 2.1 Extrair `whoamiLines(dict, data)` puro e criar `ServerWhoami` + `<nav aria-label="sitemap">` renderizados no servidor; verificar `curl -s /en | grep -c 'href="/en/projects'` ≥ 1 — `whoamiLines` exportado de `content-commands.tsx`; `initialOutput()` + `<Sitemap>` em `components/terminal/initial-output.tsx`; `curl` = 1 (e `/pt-BR/projects` em pt-BR), bio e MOTD presentes no HTML
- [x] 2.2 Fazer o hook adotar `initialLines` sem duplicar; verificar executando `help` após hidratar — `TerminalApp` converte `initialLines` em entradas `instant`; no navegador (`next start`) `help` após hidratar mantém `whoami` + sitemap acima, uma única vez, sem erro de hidratação; teste em `terminal-app.test.tsx`
- [x] 2.3 Testar com JavaScript desabilitado: MOTD, bio e links visíveis e clicáveis — Playwright (`javaScriptEnabled: false`, Chromium headless): overlay de boot `display: none`, MOTD/bio visíveis, clique em `projects` → `/en/projects` → abre um projeto

## 3. Layout, metadata e redirects

- [x] 3.1 Remover `ChatLauncher`, `DevMarqueeStrip`, `KonamiEgg` do layout (manter `ConsoleEgg`), ajustar `viewport.themeColor` e títulos/descrições em `lib/seo.ts`; verificar `<title>` e JSON-LD no HTML — `DevMarqueeStrip` já não estava no layout; `themeColor` já era `#282A36`. HTML: `<title>Marco Filho — maarkn@dev</title>`, JSON-LD `WebSite` + `Person`
- [x] 3.2 Gerar novo set de favicons `>_` mantendo nomes em `public/favicon/` e atualizar `manifest.ts`; verificar ícone na aba e manifest válido no DevTools — SVG com o glifo em paths (sem depender de fonte), PNG 16/32/180/192/512 e `.ico` (16/32/48) via sharp; `src/app/favicon.ico` também trocado; no navegador todos os `<link rel=icon>` e os ícones do manifest decodificam, `theme_color`/`background_color` `#282A36`
- [x] 3.3 Transformar `/[lang]/chat` em redirect para `/[lang]?cmd=ask`, tratar `?cmd=ask` pré-preenchendo o prompt e remover `/chat` do `sitemap.ts`; verificar redirect e sitemap — `/en/chat` → 307 `/en?cmd=ask`; prompt abre com `ask ` digitado (`PromptPrefill`, `useSearchParams` em `Suspense`); `sitemap.xml` sem `/chat`

## 4. Verificação

- [x] 4.1 Lighthouse mobile na home: LCP < 2.5s, CLS < 0.1, SEO 100 (registrar em `.docs/perf/`) — 3 runs: LCP 2.42–2.45 s, CLS 0, SEO 100, perf 97–98 (`.docs/perf/2026-09-15-home-terminal-mobile.md`); para sair do limite (2.57 s) o subset `latin-ext` da Cascadia foi removido (nenhum glifo do site o usa)
- [x] 4.2 `pnpm lint && pnpm build` verdes; smoke de todas as rotas públicas — lint 0 erros (8 warnings pré-existentes em arquivos não tocados), build ok, `pnpm test` 80/80; smoke em `next start`: `/`→`/en`, home, listagens, detalhes, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, OG image, favicons e CV 200
