"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * O retorno de uma ação é uma LINHA DE SAÍDA, não um cartão de notificação
 * (bko-04). Quadrado, monoespaçado, sem ícone gráfico, sem barra de
 * progresso, no canto inferior direito — onde a saída de um programa cai.
 *
 * ── O marcador é texto, e é `aria-hidden` ──────────────────────────────────
 * `✓` para sucesso, `✗` para erro, entregues pelo slot `icons` do sonner no
 * lugar dos ícones do lucide. São `aria-hidden` porque o sonner já anuncia o
 * texto do toast por região viva: deixá-los visíveis ao leitor faria a
 * mensagem virar "marca de seleção candidatura criada". Como são texto, a
 * distinção sucesso/erro não depende só de cor — o canal duplo que a cor
 * sozinha não daria a quem não distingue vermelho de verde.
 *
 * ── Cor no marcador, não no toast inteiro ──────────────────────────────────
 * `richColors` está fora: ele tinge o cartão todo e reintroduz a caixa
 * colorida que o painel não usa mais. A superfície continua `--popover` com
 * borda `--line` e texto `--fg`; quem carrega a cor é o marcador. Medido na
 * paleta `soft` sobre `--popover` (#21222C): `--green` 10.07:1,
 * `--destructive` 6.65:1, `--fg` 14.59:1.
 *
 * A paleta do admin é fixada no servidor (admin/layout.tsx) e não há
 * `ThemeProvider` sob /admin, então o tema do sonner também é fixado em vez
 * de ser lido do `next-themes` — o hook devolvia sempre "system" e o layout
 * sobrescrevia de qualquer jeito. `theme` e `position` vêm antes do spread,
 * então um call site ainda consegue passar os seus.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <span aria-hidden="true">✓</span>,
        info: <span aria-hidden="true">i</span>,
        warning: <span aria-hidden="true">!</span>,
        error: <span aria-hidden="true">✗</span>,
        loading: <span aria-hidden="true">…</span>,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          // Continua apontando para --radius (= 0): este é o único consumidor
          // real do token, e o CSS do admin registra isso.
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // Só o marcador ganha classe: a superfície do toast é estilizada
          // pelas variáveis `--normal-*` acima e pela regra de fonte sobre
          // `[data-sonner-toast]` em admin.css. Uma classe sem regra nenhuma
          // no `toast` só faria o próximo leitor procurar CSS que não existe.
          icon: "admin-output-marker",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
