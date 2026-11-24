## Why

O backoffice está vestido de terminal e só em português: difícil de navegar e inútil para quem fizer um fork. Esta change troca a estrutura em volta das telas e traz tema e idioma.

## What Changes

- Estrutura nova: menu em grupos, recolhível, busca por `⌘K`, "Criar", menu da conta, barra inferior no celular.
- Três temas, com a mesma preferência do site.
- Interface em PT e EN, com troca no menu da conta e início pelo idioma do site; datas no idioma escolhido, fuso configurável com São Paulo como padrão.
- Login no desenho novo.
- Aposenta `admin-terminal-chrome`.
- As telas continuam com o conteúdo atual dentro da estrutura nova até as changes seguintes.

**Fora do escopo:** listas, formulários, visão geral e telas novas; prefixo de idioma na URL.

## Capabilities

### New Capabilities
- `admin-shell`: estrutura, navegação, idioma e entrada do backoffice.

### Modified Capabilities
- `admin-terminal-chrome`: aposentada.
- `admin-theme`: três temas no lugar da paleta fixa.

## Impact

- `src/app/admin/layout.tsx`, `admin.css`, `src/components/admin/**`, `src/lib/format.ts`, dicionários (chave `admin`), `src/app/admin/AGENTS.md`.
- **Branch:** feat/rebranding
- **Depende de:** rebrand-02-site-chrome
