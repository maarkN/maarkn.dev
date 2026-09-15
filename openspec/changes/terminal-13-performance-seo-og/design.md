## Context

Home ISR 1h; Ghost ISR 5min; `opengraph-image.tsx` usa `ImageResponse`. Deploy via Traefik/Docker (`DEPLOY.md`). Ver proposal.md.

## Goals / Non-Goals

**Goals:** números medidos e versionados; nenhum regresso silencioso.
**Non-Goals:** CDN/edge caching novo; analytics.

## Decisions

- **Baseline antes do merge da 06** salvo em `.docs/perf/baseline-2026-09.json`; comparação em `after-terminal.json` + `README.md` com tabela.
- **Markdown via `next/dynamic`** no comando `ask` (já previsto na 07) — aqui só se valida o chunk separado.
- **Relógio** com `width: 5ch` e `tabular-nums` para CLS zero.
- **OG**: `ImageResponse` com `Cascadia Code` `.ttf` lido de `public/fonts` (ou do pacote da fonte) via `fetch` no edge/server; layout: barra roxa, `maarkn@dev:~$ whoami` e três linhas do dicionário. Mesma função para home e internas, variando título.
- **Verificação de fontes** pela aba Network e por `document.fonts` em teste manual; sem ferramenta extra.
- **Cache-Control** conferido em produção após o deploy (não é código da app).

## Risks / Trade-offs

- [Overlay de boot como LCP] → é texto; se o Lighthouse eleger o overlay, ainda cumpre o limite.
- [`.ttf` grande no `ImageResponse`] → usar subset ou peso único (Regular) para a OG.
