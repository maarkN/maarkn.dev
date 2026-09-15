## Why

Com shell, engine, comandos e boot prontos, a home pode ser trocada. O risco é SEO/legibilidade sem JS: um terminal 100% client seria invisível para crawlers e leitores. Esta change faz a troca garantindo HTML útil desde o servidor e alinha ícones/metadata à nova identidade.

## What Changes

- **BREAKING** `/[lang]` passa a renderizar o terminal; `Hero`, `BigNumbers`, `About`, `Projects`, `Toolkit`, `Contact` e `LatestLogs` saem da home (arquivos removidos na change 12).
- Rota de preview `/[lang]/terminal` removida.
- Fallback SSR: MOTD + saída de `whoami` + lista de links para as rotas internas renderizados no servidor e adotados pelo terminal ao hidratar.
- Route groups `(terminal)` e `(pages)` sob `[lang]` para isolar o `overflow: hidden` da home.
- **BREAKING** `ChatLauncher` flutuante, `DevMarqueeStrip` e `KonamiEgg` removidos do layout; `/[lang]/chat` vira redirect para `/[lang]?cmd=ask`.
- Novo favicon `>_`, `themeColor #282A36`, manifest e título/descrição atualizados.

## Capabilities

### New Capabilities
- `terminal-home`: comportamento da rota raiz como terminal, incluindo fallback sem JavaScript, metadata e redirecionamentos.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/app/[lang]/page.tsx`, `layout.tsx`, novos `(terminal)/layout.tsx` e `(pages)/layout.tsx`, `src/app/[lang]/chat/`, `src/lib/seo.ts`, `src/app/manifest.ts`, `public/favicon/*`.
- Depende de 04 e 05. Desbloqueia 07 e 09.
