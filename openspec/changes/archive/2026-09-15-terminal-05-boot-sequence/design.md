## Context

Mockup: `boot()` async com `wait()` por caractere, `AbortController` para skip, `bootEl.gone` + `term.on`. O shell React já existe (change 02) e o engine (03) tem `clear`. Ver proposal.md.

## Goals / Non-Goals

**Goals:** fidelidade ao timing do mockup, zero impacto em SEO, sem boot repetido.
**Non-Goals:** fallback SSR completo da home (change 06) — aqui só garantimos que o overlay é sobreposto ao shell renderizado.

## Decisions

- **Overlay como componente client separado (`boot-overlay.tsx`)** renderizado pelo shell quando `shouldBoot` é verdadeiro; o shell fica no DOM com `aria-hidden` enquanto o overlay existe. Alternativa: substituir o shell pelo overlay — rejeitada (perde SSR do conteúdo).
- **`sessionStorage["maarkn-booted"]`** decide `shouldBoot`; estado inicial no SSR é "não sabe" (`pending`) → o overlay é renderizado opaco (cor de fundo) com o conteúdo em `visibility: hidden` até o efeito ler o storage, evitando flash do terminal para quem vai bootar e flash das linhas para quem não vai. Aceita 1 frame de atraso. Um `<noscript><style>` dentro do overlay o esconde sem JavaScript, para o shell SSR ficar visível. O shell só recebe `inert`/`aria-hidden` durante `booting` (nunca no HTML do servidor).
- **Estados** (`useBoot`): `pending` → `booting` (digitando) → `fading` (shell já utilizável, overlay some em 450ms) → `done` (overlay desmontado). `reboot` incrementa uma `key` para remontar o overlay.
- **Timings** do mockup para pausas: 10ms espaço, 240ms após `[ok]`, 120ms após outras, 380ms antes do fade de 450ms. O por-caractere foi reduzido de 16–40ms para 12–26ms: com os 16–40ms do mockup as seis linhas levam ~5,5s em média, acima do teto de 5s do spec; com 12–26ms ficam em ~4,2s (en) / ~4,4s (pt-BR). Após skip, as linhas completas ficam 150ms na tela antes do fade.
- **Skip via `keydown`/`pointerdown` no `window`** com `AbortController`; teclas modificadoras sozinhas (Shift, Meta) não contam.
- **`reduce`** lido de `matchMedia` no client; quando verdadeiro, marca a sessão como bootada e não renderiza o overlay.
- **Foco condicional** por `matchMedia('(pointer: fine)')`, também no caminho sem boot (sessão já bootada) — o foco incondicional na montagem do shell (change 02) foi substituído por este.
- **Dicionário**: `terminal.boot = { lines: string[6], skip: string }` (o texto "press any key…" também vem do dicionário).

## Risks / Trade-offs

- [Lighthouse pode eleger o overlay como LCP] → overlay é texto puro, LCP continua rápido; medido na change 13.
- [`sessionStorage` indisponível (modo privado restrito)] → `try/catch`; sem storage, boot a cada carga.
