"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useSiteTheme } from "@/components/site-theme"

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
 * `richColors` está fora: ele tinge o cartão todo. A superfície é `--popover`
 * com borda `--border` e texto `--popover-foreground`; quem carrega a cor é o
 * marcador (`--ok`, `--destructive`).
 *
 * O tema do sonner acompanha o do site. As cores não dependem dele, porque as
 * variáveis `--normal-*` abaixo já são as do tema.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={useSiteTheme() === "light" ? "light" : "dark"}
      position="bottom-right"
      // Above the bar at the foot of a phone.
      offset={{ bottom: "calc(var(--site-base) + 24px)" }}
      mobileOffset={{ bottom: "calc(var(--site-base) + 16px)" }}
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
