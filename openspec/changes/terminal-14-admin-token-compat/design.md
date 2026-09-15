## Context

`admin-shell.tsx`, formulários e login usam classes Tailwind sobre `--surface`, `--accent`, `--muted` etc. `admin/layout.tsx` é independente de `[lang]/layout.tsx`. Ver proposal.md.

## Goals / Non-Goals

**Goals:** admin legível e isolado; permitir que a change 12 apague os tokens legados de `globals.css`.
**Non-Goals:** redesenhar o admin; migrar dados de cover.

## Decisions

- **`admin.css`** define os aliases (`--surface: var(--bg-dim); --surface-2: #2F313E; --surface-3: var(--sel); --border: var(--line); --border-2: var(--sel); --text: var(--fg); --text-2: #D6D6D2; --muted: var(--comment); --accent: var(--purple); --accent-2: var(--pink); --accent-glow: color-mix(in srgb, var(--purple) 25%, transparent)`) sob o seletor `.admin-root`, aplicado no layout do admin. Mantém as classes existentes intactas.
- **Forçar `data-theme="soft"`** no layout do admin (server) e não carregar o boot script de tema.
- **Fontes**: `--font-sans/display/mono` → `--font` (mono) também no admin; coerente e evita carregar outra fonte.
- **`StatusBar`** reutilizada como header do admin apenas se não exigir mudanças no componente; caso contrário, manter `admin-shell`.

## Risks / Trade-offs

- [Formulários densos ficam menos legíveis em mono] → aumentar `line-height` e espaçamento vertical nos forms do admin.
- [Componentes admin com cores hardcoded] → `grep -n "#[0-9a-f]\{3,6\}" src/components/admin` e trocar por tokens.
