## Why

A change 14 mapeou os tokens legados do admin (`--surface`, `--text`, `--accent`…) sobre a paleta Dracula para mantê-lo legível "sem virar terminal". A decisão agora é a oposta: o admin passa a falar a mesma língua visual do site.

Some a razão de existir do mapeamento legado. E o backoffice chega com 20 primitives shadcn que dependem de um terceiro vocabulário de tokens (`--background`, `--primary`, `--ring`…) — hoje ausente da `main`. Manter três camadas (`shadcn → alias legado → Dracula`) é o caminho garantido para divergência de cor.

## What Changes

- `admin.css` deixa de mapear aliases legados e passa a definir **os tokens shadcn diretamente sobre os nomes da paleta**, sob `.admin-root`. Uma indireção, não duas.
- Os aliases legados (`--surface`, `--surface-2`, `--surface-3`, `--text`, `--text-2`, `--bg-low`, `--border-2`, `--accent-glow`, `--grid-opacity`) são removidos, e cada uso no admin é reescrito para um token de paleta.
- As correções de contraste da change 14 são preservadas explicitamente — o rebase as reintroduziria quebradas.
- Fonte, `data-theme="soft"` fixo e ausência de `ThemeProvider` no admin permanecem como estão.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `admin-theme`: a origem dos tokens muda de "aliases legados mapeados" para "paleta Dracula direta", e o requisito de legibilidade passa a cobrir os primitives shadcn.

## Impact

- `src/app/admin/admin.css` (reescrito), `src/app/globals.css` (ganha as declarações `--color-*` do vocabulário shadcn no `@theme inline`).
- Todo `src/components/ui/**` e `src/components/admin/**` por consequência de token — sem mudança de marcação.
- Depende da change 00. Bloqueia as changes 02–04.
