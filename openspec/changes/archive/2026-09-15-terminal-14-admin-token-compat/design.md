## Context

`admin-shell.tsx`, formulários e login usam classes Tailwind sobre `--surface`, `--accent`, `--muted` etc. `admin/layout.tsx` é independente de `[lang]/layout.tsx`. Ver proposal.md.

## Goals / Non-Goals

**Goals:** admin legível e isolado; permitir que a change 12 apague os tokens legados de `globals.css`.
**Non-Goals:** redesenhar o admin; migrar dados de cover.

## Decisions

- **`admin.css`** define os aliases (`--bg-low/--surface: var(--bg-dim); --surface-2: #2F313E; --surface-3: var(--sel); --border: var(--line); --border-2: var(--sel); --text: var(--fg); --text-2: #D6D6D2; --accent: var(--purple); --accent-2: var(--pink); --accent-glow: color-mix(in srgb, var(--purple) 25%, transparent); --grid-opacity`) sob o seletor `.admin-root`, aplicado no `<body>` do layout do admin. Mantém as classes existentes intactas.
  - **Desvio de contraste:** `--muted` é `#A2A6B3` (não `var(--comment)`): `#7B7F8B` fica em 3.2–3.9:1 sobre as superfícies do admin e reprovaria rótulos/help/cabeçalhos de tabela no critério 4.5:1. Pelo mesmo motivo `--red` é elevado para `#F28B8B` dentro do admin (o `#EE6666` da paleta cai a 4.0–4.4:1 sobre as caixas `bg-[var(--red)]/10`).
  - Botões primários (`bg-[var(--accent)]`) usam texto `var(--bg)` em vez de `text-white` (branco sobre `--purple` = 2.25:1; `--bg` = 6.3:1).
  - Inputs/selects/textareas usam borda `--border-2` (`--sel`) em repouso — `--line` sobre `--surface-2` é 1.13:1, praticamente invisível — e no foco borda + anel de 1px em `--accent` (regra global em `admin.css`, `:focus-visible`).
- **Forçar `data-theme="soft"`** no layout do admin (server), sem boot script e sem `ThemeProvider` (o provider gravaria `soft` no `localStorage` e sobrescreveria a preferência do visitante no site público). Nenhum chunk carregado em `/admin/**` contém código de tema.
- **Fontes**: `--font-sans/display/mono` → `--font` (mono) também no admin, redefinidos sob `.admin-root` para sobreviver à limpeza do `@theme` na change 12; o layout do admin carrega só `caskaydia`. As classes `font-sans` dos inputs foram trocadas por `font-mono`.
- **`StatusBar`** NÃO é reutilizada: depende de `useTheme` e renderiza os toggles de paleta/fonte, que o admin não pode exibir. `admin-shell` permanece.

## Risks / Trade-offs

- [Formulários densos ficam menos legíveis em mono] → aumentar `line-height` e espaçamento vertical nos forms do admin.
- [Componentes admin com cores hardcoded] → `grep -n "#[0-9a-f]\{3,6\}" src/components/admin` e trocar por tokens. Restam apenas os defaults do gradiente legado no `project-form.tsx` (dados) e o tile de monograma em `/admin` (preview do gradiente salvo, decorativo); `generator/[id]` é a folha branca de impressão e mantém `neutral-*` de propósito.
