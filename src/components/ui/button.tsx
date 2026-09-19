import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        // RESOLVIDO em bko-04 (pendência aberta pela bko-01): o botão
        // destrutivo é SÓLIDO, `--destructive` com texto
        // `--destructive-foreground`. Medido na paleta `soft`, que é a única
        // que o admin renderiza:
        //
        //   caixa tingida (o que havia): texto 5.58:1 sobre `bg-destructive/10`
        //     composto em --popover, 5.04:1 em --bg, e — o problema — a caixa
        //     em si lê 1.19:1 contra --popover: um botão sem contorno, num
        //     diálogo cuja ação é irreversível. No hover (/20) o texto cai
        //     para 4.61:1, a um décimo do piso.
        //   sólido (o que ficou): texto --bg sobre --destructive = 6.00:1; a
        //     superfície lê 6.65:1 contra --popover e 6.00:1 contra --bg, bem
        //     acima dos 3:1 de 1.4.11; no hover (/90) o texto fica em 5.11:1.
        //
        // O sólido ganha nos três eixos (texto, contorno, hover), dá o único
        // consumidor ao token --destructive-foreground — que a bko-01 deixou
        // declarado e órfão — e é o que o cenário "Diálogo de confirmação" da
        // spec admin-theme já descreve. Nenhuma correção de spec foi precisa.
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:border-destructive focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-none px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs": "size-6 rounded-none [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-none",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * ── Convenção de rótulo do backoffice (bko-04) ────────────────────────────
 * Botão com texto visível escreve o rótulo entre colchetes: `[ salvar ]`,
 * `[ cancelar ]`, `[ excluir ]`. Os colchetes são TEXTO do `<button>`, não
 * `::before`/`::after`, por três motivos: entram no nome acessível, são
 * selecionáveis com o cursor, e sobrevivem ao modo de alto contraste do
 * sistema (que descarta conteúdo gerado em algumas plataformas). Um `bracket`
 * prop foi descartado: o `asChild` deste componente entrega os filhos a um
 * `Slot`, que exige um único elemento — qualquer wrapper quebraria metade
 * dos call sites (`<Button asChild><Link/></Button>`).
 *
 * Fora da convenção, deliberadamente: botões só de ícone (não têm rótulo
 * visível — o nome vem de `aria-label`) e `variant="link"`, que é um link
 * pintado de link e não uma ação em caixa.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
