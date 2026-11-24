## Why

Carreira, notas e links ainda têm aparência de terminal, e falta uma página para quem tria currículos e tem um minuto.

## What Changes

- Carreira com linha do tempo em barras e lista; clicar abre janela, endereço direto abre a página.
- Novo `/[lang]/summary`, o Resumo em 1 minuto, com copiar em texto.
- Notas e links no desenho novo.
- Aposenta a capability `terminal-page-chrome`.

**Fora do escopo:** edição de carreira no backoffice, textos novos de notas.

## Capabilities

### New Capabilities
- `site-career`: linha do tempo, lista e detalhe das experiências.
- `site-summary`: resumo para triagem.
- `site-notes`: lista e leitura das notas.
- `site-links`: página de links.

### Modified Capabilities
- `terminal-page-chrome`: aposentada.
- `terminal-navigation`: sai o retorno por comando das páginas internas.
- `terminal-accessibility`: sai a parte das páginas internas.

## Impact

- Rotas `career`, `summary`, `blog`, `links`, componentes de página do terminal (removidos), sitemap, dicionários.
- **Branch:** feat/rebranding
- **Depende de:** rebrand-05-projects, rebrand-03-home
