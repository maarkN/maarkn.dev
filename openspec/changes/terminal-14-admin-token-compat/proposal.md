## Why

O painel `/admin` usa os mesmos tokens CSS do site. Com a troca para Dracula e a remoção dos tokens legados (change 12), ele precisa de um mapeamento próprio para continuar legível — sem virar terminal.

## What Changes

- Tokens legados movidos para `src/app/admin/admin.css`, importado só pelo layout do admin, mapeados para a paleta Dracula.
- Admin sempre em paleta `soft`; sem seletor de tema; sem fontes proporcionais remanescentes.
- Revisão de contraste dos formulários; campos de gradiente de cover rotulados como legado (schema intocado).
- Barra superior do admin opcionalmente adotando o `StatusBar`.

## Capabilities

### New Capabilities
- `admin-theme`: aparência e legibilidade do painel administrativo após a migração da paleta.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/app/admin/layout.tsx`, `admin.css`, `components/admin/*` (ajustes de classe), `login-form.tsx`.
- Depende de 01. Bloqueia a remoção final dos tokens legados na 12.
