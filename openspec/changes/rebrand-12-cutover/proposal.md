## Why

Com as telas prontas na branch, falta o que só faz sentido de uma vez: identidade para buscadores e redes, auditoria final, documentação e a ida para a `main`.

## What Changes

- Título, descrição, ícone, manifest, cor do navegador e imagens de compartilhamento na identidade nova.
- Sitemap com o resumo e sem a Versão CLI; dados estruturados revistos.
- Auditoria de desempenho, acessibilidade e textos fixos.
- READMEs com as capturas novas, seção "Forking" e `LICENSE`.
- Merge de `feat/rebranding` na `main`.

**Fora do escopo:** funcionalidade nova.

## Capabilities

### New Capabilities

### Modified Capabilities
- `site-seo-performance`: indexação, identidade e imagem de compartilhamento.
- `terminal-home`: a identidade da home sai da Versão CLI.

## Impact

- `src/lib/seo.ts`, `src/lib/og.tsx`, `src/app/manifest.ts`, `public/favicon`, sitemap, READMEs, `LICENSE`, `DEPLOY.md`, `docs/media`, `AGENTS.md`.
- **Branch:** feat/rebranding
- **Depende de:** rebrand-01-foundation, rebrand-02-site-chrome, rebrand-03-home, rebrand-04-projection, rebrand-05-projects, rebrand-06-career-and-pages, rebrand-07-tech-icons, rebrand-08-admin-shell, rebrand-09-admin-lists-and-forms, rebrand-10-admin-overview, rebrand-11-admin-screens
