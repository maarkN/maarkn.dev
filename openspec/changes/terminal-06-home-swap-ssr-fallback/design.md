## Context

A home atual é ISR (`revalidate = 3600`) e monta seções server-rendered. O layout `[lang]` injeta `ChatLauncher`, easter eggs e JSON-LD. O shell do terminal é client. Ver proposal.md.

## Goals / Non-Goals

**Goals:** troca atômica da home, LCP em texto SSR, links crawláveis, sem regressão de metadata.
**Non-Goals:** deep-link `?cmd=` genérico (change 09 — aqui só o caso `ask` para o redirect), reskin das páginas internas (08).

## Decisions

- **Route groups**: `src/app/[lang]/(terminal)/page.tsx` + `layout.tsx` (aplica `overflow:hidden` no `<body>` via classe no layout do grupo) e `src/app/[lang]/(pages)/…` para as demais rotas. Substitui o toggle de classe por efeito da change 02. Alternativa: `usePathname` no layout raiz — rejeitada (client no layout raiz).
- **`ServerWhoami`** (server component) renderiza a mesma árvore que o comando `whoami` produz, reutilizando a função pura `whoamiLines(dict, data)` de `content-commands` — uma única fonte da saída. O hook adota `initialLines` como `lines[0..n]` marcados `instant`.
- **`<nav aria-label="sitemap">`** com os links internos/externos fica dentro da saída inicial (é o que crawlers e no-JS veem); com JS, permanece como parte legítima da saída de boas-vindas.
- **Overlay de boot** já é sobreposição (change 05); no no-JS o overlay nem é renderizado porque é client-only → conteúdo aparece direto. Remover o `<noscript>` do mockup.
- **`/chat` → `redirect()`** em `page.tsx` (server), preservando `lang`. `sitemap.ts` deixa de listar `/chat`.
- **Favicon** gerado a partir do SVG inline do mockup em 16/32/180/192/512 + `.ico`, mantendo os nomes de arquivo para não alterar `metadata.icons`.

## Risks / Trade-offs

- [Duplicação de texto entre saída SSR e `whoami` executado depois pelo visitante] → aceitável e coerente com um terminal (é rodar o comando de novo).
- [Trocar a home remove o formulário de contato até a change 10] → `contact` já lista canais; janela curta.
- [Cache ISR antigo servindo home velha após deploy] → `revalidatePath` no deploy ou aguardar 1h; documentar no PR.

## Migration Plan

1. Merge após 04 e 05; deploy em preview; validar `curl` sem JS e Lighthouse.
2. Rollback: reverter o commit — a home antiga volta intacta (componentes ainda existem até a change 12).
