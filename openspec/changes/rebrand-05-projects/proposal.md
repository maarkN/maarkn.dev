## Why

A lista e o detalhe dos projetos hoje imitam saída de terminal, o que afasta quem não é técnico. A referência pedida é o apps.oprimo.dev: achar rápido e entender o que é, qual foi a função de Marco e o que ele entregou.

## What Changes

- Lista com contagem por situação, destaques, categorias com quantidade, busca e filtro na URL.
- Detalhe com identificação, ações, tela ou projeção do ícone, o que é, função, entregas, galeria, perguntas rápidas, ficha técnica, links, projetos parecidos e próximo.
- Ícone próprio por projeto.

**Fora do escopo:** ícones de tecnologia (`rebrand-07-tech-icons`), edição pelo backoffice (`rebrand-11-admin-screens`), mudança de URL.

## Capabilities

### New Capabilities
- `site-projects`: lista e detalhe dos projetos.

### Modified Capabilities
- `terminal-page-chrome`: saem os requisitos de projetos.

## Impact

- `src/app/[lang]/…/projects`, `src/components/site/projects/**`, dicionários, `sitemap` (sem mudança de endereço).
- **Branch:** feat/rebranding
- **Depende de:** rebrand-02-site-chrome, portfolio-01-content-in-db
