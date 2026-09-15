## Context

Hoje `globals.css` (893 linhas) define três blocos de tokens (`:root`/dark, `[data-theme=light]`, `[data-theme=dev]`) consumidos por Tailwind via `@theme inline`. O `ThemeProvider` guarda `maarkn-theme` em `localStorage` e um script inline (`themeBootScript`, carregado com `next/script beforeInteractive`) aplica `data-theme` antes da hidratação. Fontes vêm de `next/font/google`. Ver proposal.md para a motivação.

## Goals / Non-Goals

**Goals:**
- Trocar os tokens sem quebrar nenhuma rota existente (as changes 02–14 ainda vão consumir `--surface`, `--accent` etc. por um tempo).
- Duas dimensões independentes de preferência (paleta × fonte) com um único script de boot.

**Non-Goals:**
- Layout do terminal, remoção de componentes antigos, admin (changes 02, 12, 14).
- Suporte a paleta clara — o design é dark-only por definição (`color-scheme: dark`).

## Decisions

- **Tokens Dracula em `:root` + override em `:root[data-theme="classic"]`**, exatamente como no mockup. Alternativa: manter o nome `dark` para soft — rejeitada, porque o comando `theme` do terminal expõe os nomes `soft`/`classic` ao usuário.
- **Aliases legados apontando para tokens novos** (`--surface: var(--bg-dim)`, `--accent: var(--purple)`, `--border: var(--line)`, `--muted: var(--comment)`, `--text: var(--fg)`, `--text-2: #D6D6D2`, `--surface-2: #2F313E`, `--surface-3: var(--sel)`, `--accent-glow: color-mix(in srgb, var(--purple) 25%, transparent)`). Permite migrar rota a rota. Alternativa: reescrever tudo de uma vez — rejeitada pelo tamanho do blast radius.
- **Cascadia Code via `next/font/google` (`Cascadia_Code`, pesos 300–700, subsets latin + latin-ext, `display: swap`)**; se o Next 16 não listar a fonte, fallback para `next/font/local` com os arquivos oficiais. DaddyTimeMono sempre via `next/font/local` (`src/app/fonts/DaddyTimeMono.otf` — o projeto oficial distribui `.otf`, não `.ttf`) com `preload: false` e variável `--font-daddytime`; as duas fontes ficam num módulo compartilhado `src/app/fonts.ts` usado pelos layouts `[lang]` e `admin`. `--font` em `:root` aponta para caskaydia; `:root[data-font="daddytime"]` sobrescreve. `--font-sans`, `--font-display`, `--font-mono` do `@theme` apontam todos para `--font`.
- **Duas chaves de storage** (`maarkn-theme`, `maarkn-font`) em vez de um objeto JSON: mantém compatibilidade com a chave existente e simplifica a migração dos valores antigos no próprio boot script.
- **`ThemeProvider` expõe `{ theme, font, setTheme, setFont, toggleTheme, toggleFont }`** e mantém `THEMES` exportado para o `theme-switcher.tsx` atual continuar compilando (ele será removido na change 12).

## Risks / Trade-offs

- [Contraste de `--comment` (#7B7F8B) sobre `--bg` fica em ~4.1:1, abaixo de AA para texto pequeno] → Registrar aqui e resolver na change 11 (ajuste para `#8B8F9C` ou uso só em texto grande).
- [Fonte proporcional some das páginas internas antes do reskin, deixando-as visualmente estranhas] → Aceitável: rotas continuam funcionais; reskin vem na change 08.
- [Licença da DaddyTimeMono] → Confirmada SIL OFL 1.1 (Jason Stewart, 2018); `DaddyTimeMono-LICENSE.md` versionado ao lado do `.otf`.

## Migration Plan

1. Merge desta change isoladamente; validar todas as rotas em preview.
2. Rollback: reverter o commit — não há mudança de dados nem de schema.
