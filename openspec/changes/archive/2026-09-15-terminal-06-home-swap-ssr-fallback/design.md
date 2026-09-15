## Context

A home atual é ISR (`revalidate = 3600`) e monta seções server-rendered. O layout `[lang]` injeta `ChatLauncher`, easter eggs e JSON-LD. O shell do terminal é client. Ver proposal.md.

## Goals / Non-Goals

**Goals:** troca atômica da home, LCP em texto SSR, links crawláveis, sem regressão de metadata.
**Non-Goals:** deep-link `?cmd=` genérico (change 09 — aqui só o caso `ask` para o redirect), reskin das páginas internas (08).

## Decisions

- **Route groups**: `src/app/[lang]/(terminal)/page.tsx` + `layout.tsx` e `src/app/[lang]/(pages)/…` (já criado pela 08) para as demais rotas. Um layout aninhado não alcança o `<body>`, então o layout do grupo renderiza um marcador `<div data-terminal-route class="contents">` e `globals.css` trava o documento com `html:has([data-terminal-route])` — funciona sem JavaScript e nunca vaza para as páginas internas. Substitui o toggle de classe por efeito da change 02. Alternativa: `usePathname` no layout raiz — rejeitada (client no layout raiz).
- **Saída inicial** (`components/terminal/initial-output.tsx`, server-safe): `initialOutput({ labels, locale, data })` = `whoamiLines(dict, data)` (função pura exportada de `content-commands`, a mesma que o comando `whoami` usa — uma única fonte da saída) + linha em branco + `<Sitemap>`. A page passa o array como prop `initialLines` do `TerminalApp` (elementos atravessam a fronteira RSC como o `motd` já fazia); o app os converte em entradas `instant` e o hook os adota como `lines[0..n]`. Assim o HTML do servidor e a primeira renderização do cliente são a mesma árvore — nada é impresso duas vezes, e `clear`/`reboot` os descartam como qualquer outra saída. Em vez de um componente `ServerWhoami` separado, porque um componente não consegue "devolver linhas" para o estado do hook.
- **`<nav aria-label="sitemap">`** (`# projects · career · blog · links · cv · linkedin · github`, links `quiet`) é a última linha da saída inicial (é o que crawlers e no-JS veem); com JS, permanece como parte legítima da saída de boas-vindas. Os nomes das rotas são os diretórios do `cd` da change 09.
- **Rolagem**: o hook não rola a tela para o fim na montagem (a saída inicial é lida a partir do MOTD); só as impressões seguintes rolam.
- **`?cmd=ask`**: `PromptPrefill` (client, `useSearchParams` dentro de `Suspense`, como decidido na 09) escreve `ask ` no prompt; a home continua prerenderizada/ISR.
- **Overlay de boot** já é sobreposição (change 05) e é renderizado no SSR em estado `pending`; sem JS, o `<noscript><style>` que a 05 colocou dentro dele o esconde → conteúdo aparece direto. O `<noscript>` do mockup ("this portfolio needs JavaScript") não é portado.
- **`/chat` → `redirect()`** em `page.tsx` (server), preservando `lang`. `sitemap.ts` deixa de listar `/chat`.
- **Favicon** `>_` roxo (`#BF9EEE`) sobre `#282A36` como no SVG do mockup, mas com o glifo desenhado em paths (o mockup usa `<text font-family="monospace">`, que renderiza diferente em cada máquina). Rasterizado com `sharp` em 16/32/180/192/512 + `.ico` (PNG-in-ICO 16/32/48), mantendo os nomes de arquivo para não alterar `metadata.icons`; `src/app/favicon.ico` recebe o mesmo `.ico`. O apple-touch-icon é quadrado (iOS aplica a própria máscara).
- **Fonte**: Cascadia só com o subset `latin` — nenhum glifo do site (en, pt-BR) está em `latin-ext` e os símbolos (`→ ● ↗ █`) não estão em nenhum dos dois; tirar o segundo woff2 pré-carregado foi o que levou o LCP simulado de 2.57 s para 2.42 s.

## Risks / Trade-offs

- [Duplicação de texto entre saída SSR e `whoami` executado depois pelo visitante] → aceitável e coerente com um terminal (é rodar o comando de novo).
- [Trocar a home remove o formulário de contato até a change 10] → `contact` já lista canais; janela curta.
- [Cache ISR antigo servindo home velha após deploy] → `revalidatePath` no deploy ou aguardar 1h; documentar no PR.

## Migration Plan

1. Merge após 04 e 05; deploy em preview; validar `curl` sem JS e Lighthouse.
2. Rollback: reverter o commit — a home antiga volta intacta (componentes ainda existem até a change 12).
