## Context

Mockup: `boot()` async com `wait()` por caractere, `AbortController` para skip, `bootEl.gone` + `term.on`. O shell React já existe (change 02) e o engine (03) tem `clear`. Ver proposal.md.

## Goals / Non-Goals

**Goals:** fidelidade ao timing do mockup, zero impacto em SEO, sem boot repetido.
**Non-Goals:** fallback SSR completo da home (change 06) — aqui só garantimos que o overlay é sobreposto ao shell renderizado.

## Decisions

- **Overlay como componente client separado (`boot-overlay.tsx`)** renderizado pelo shell quando `shouldBoot` é verdadeiro; o shell fica no DOM com `aria-hidden` enquanto o overlay existe. Alternativa: substituir o shell pelo overlay — rejeitada (perde SSR do conteúdo).
- **`sessionStorage["maarkn-booted"]`** decide `shouldBoot`; estado inicial no SSR é "não sabe" → renderiza overlay com `visibility: hidden` até o efeito ler o storage, evitando flash do terminal para quem vai bootar e flash do overlay para quem não vai. Aceita 1 frame de atraso.
- **Timings** copiados do mockup: 16–40ms/char (10ms espaço), 240ms após `[ok]`, 120ms após outras, 380ms antes do fade de 450ms.
- **Skip via `keydown`/`pointerdown` no `window`** com `AbortController`; teclas modificadoras sozinhas (Shift, Meta) não contam.
- **`reduce`** lido de `matchMedia` no client; quando verdadeiro, marca a sessão como bootada e não renderiza o overlay.
- **Foco condicional** por `matchMedia('(pointer: fine)')`.

## Risks / Trade-offs

- [Lighthouse pode eleger o overlay como LCP] → overlay é texto puro, LCP continua rápido; medido na change 13.
- [`sessionStorage` indisponível (modo privado restrito)] → `try/catch`; sem storage, boot a cada carga.
