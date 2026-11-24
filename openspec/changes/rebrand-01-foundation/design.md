## Context

Ver proposal.md, `docs/design/fundamentos.md` e `docs/design/moldura.md`. Site e Versão CLI dividem o layout raiz `[lang]`, e os nomes de token (`--bg`, por exemplo) coincidem. O `themeBootScript` atual aplica `data-theme` e `data-font`.

## Goals / Non-Goals

**Goals:** base única para site e backoffice; Versão CLI intocada; nenhuma biblioteca de componente nova.

**Non-Goals:** trocar o Tailwind, migrar as primitivas shadcn do backoffice (`rebrand-08-admin-shell`).

## Decisions

- **Atributo próprio (`data-site-theme`) e chave própria de armazenamento.** Reusar `data-theme` misturaria cinco valores de dois sistemas e faria a troca de rota piscar.
- **Moldura em SVG desenhado por função pura**, com `ResizeObserver` compartilhado. Alternativas: `border-image` (não permite pontes nem recorte) e `clip-path` com borda (sem linhas internas).
- **Um ouvinte de ponteiro para a página inteira**, por delegação.
- **Sem biblioteca de movimento:** CSS e View Transitions (ADR 0001).
- **Fontes por `next/font/local`**, do pacote de fontes, com subconjunto latino; a fonte condensável em um arquivo só.

## Risks / Trade-offs

- [Script de tema em linha conflita com uma CSP futura] → Mesmo bloqueio que já existe e está documentado em `next.config.ts`; o script continua único.
- [SVG por elemento pesa em listas longas] → Meta de 100 instâncias sem tarefa longa na tarefa 3.2.
