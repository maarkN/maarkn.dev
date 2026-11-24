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
- **Fontes por `next/font/local`**, com subconjunto latino; a fonte condensável em um arquivo só. Hubot Sans e Mona Sans vêm do pacote de fontes. A Cascadia Code, que a Versão CLI também usa, é a mesma que o Google Fonts servia, byte a byte: a do pacote mudaria a Versão CLI.
- **`font-display: optional` em Hubot Sans e Mona Sans** (aprovado em 2026-11-24). A fonte que perde a primeira pintura espera a próxima carga, e a substituta tem métrica próxima. Com `swap`, 2 a 4% dos textos mudam de número de linhas em largura de celular, o que contraria a spec `site-theme`.
- **Janela com moldura, aviso sólido** (aprovado em 2026-11-24). A janela é uma superfície que se abre e se fecha, e `moldura.md` a cita. O aviso informa: só o botão dele é holograma.
- **Tema antes da primeira pintura por um `<script>` simples.** `next/script` com `beforeInteractive` entrega o código à fila do runtime, que roda depois dela (75 ms contra pintura aos 56 ms). Vale também para a paleta da Versão CLI.

## Risks / Trade-offs

- [Script de tema em linha conflita com uma CSP futura] → Mesmo bloqueio que já existe e está documentado em `next.config.ts`; o script continua único.
- [Na primeira visita em rede lenta, o site aparece na fonte substituta] → Aceito: o texto é legível e nada se desloca.
- [Nenhum token de texto é legível sobre `--plate` no tema claro] → Nenhum primitivo escreve sobre ele. O token é decidido antes da primeira dica; o limite está em `fundamentos.md`.
- [Sobre `--bg-3`, algumas cores ficam abaixo de 4.5:1] → Uso restrito em `fundamentos.md`, medido por `scripts/check-contrast.ts`.
- [Saem as fatias não latinas que a folha do Google oferecia] → Nada que o site imprime as usa.
- [Navegar entre idiomas sem recarregar volta a paleta e a fonte da Versão CLI ao padrão] → Defeito anterior a esta change, presente na `main`, não corrigido aqui. O tema do site resiste.
- [SVG por elemento pesa em listas longas] → Meta de 100 instâncias sem tarefa longa na tarefa 3.2.
