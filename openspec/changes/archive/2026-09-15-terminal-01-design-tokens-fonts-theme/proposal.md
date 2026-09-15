## Why

O portfólio migra do layout em seções (3 temas dark/light/dev, Inter + Space Grotesk + JetBrains Mono) para o design "terminal" definido em `.docs/design/maarkn-terminal.html`. Tudo que vem depois (shell, comandos, páginas internas) depende da paleta Dracula e da tipografia monoespaçada estarem no lugar, por isso esta é a primeira change.

## What Changes

- **BREAKING** Remoção dos temas `light` e `dev` (scanlines, marquee, classes `dev-*`); passam a existir duas paletas Dracula: `soft` (padrão) e `classic`.
- Nova dimensão de preferência: fonte `caskaydia` (Cascadia Code, padrão) ou `daddytime` (DaddyTimeMono self-hosted), persistida e aplicada antes da hidratação.
- **BREAKING** Remoção de Inter, Space Grotesk e JetBrains Mono; toda a tipografia do site passa a ser monoespaçada.
- Tokens legados (`--surface`, `--accent`, `--border`, `--muted`, `--text`…) mantidos temporariamente como aliases para os tokens Dracula, para que rotas internas e admin continuem funcionando até as changes 08 e 14.
- Migração transparente da preferência salva: `dark`/`dev` → `soft`, `light` → `classic`.

## Capabilities

### New Capabilities
- `theme-palette`: seleção e persistência de paleta (soft/classic) e fonte (caskaydia/daddytime), aplicação sem flash antes da hidratação, migração de valores legados.

### Modified Capabilities
<!-- nenhuma spec principal existe ainda -->

## Impact

- `src/app/globals.css` (tokens, `@theme inline`, remoção de light/dev), `src/components/theme-provider.tsx`, `src/components/theme-switcher.tsx`, `src/app/[lang]/layout.tsx` (fontes, `data-theme`/`data-font`, `themeColor`).
- Novo asset `public/fonts/DaddyTimeMono.ttf` + licença.
- Visual de todas as rotas muda de cor/fonte imediatamente; layout permanece até as changes seguintes.
