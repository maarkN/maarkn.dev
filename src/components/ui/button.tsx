import * as React from "react"
import { Slot } from "radix-ui"

import { controlClass } from "@/components/holo/button"
import { HoloFrame } from "@/components/holo/frame"
import { textOf } from "@/components/holo/text"
import styles from "@/components/holo/holo.module.css"
import { cn } from "@/lib/utils"

type Variant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
type Size = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"

/**
 * A button of the backoffice is a hologram (docs/design/moldura.md): the frame
 * of `@/components/holo`, the face of the site's text, and the label says what
 * it does, with its first letter in capitals ("Salvar contato"). The shadcn
 * names of the variants stay, so that no screen has to learn new ones:
 *
 * - `default`: the primary action, solid beam.
 * - `outline`, `secondary`, `ghost`: the frame alone.
 * - `destructive`: the frame in the colour of an error, and an icon next to the
 *   verb, so that it is told apart without the colour.
 * - `link`: not a hologram, a link written as one, inside text.
 *
 * Two heights, 34 and 44px: `lg` is the tall one, everything else the short one,
 * which takes a target of 44px under a finger.
 *
 * With `asChild` the frame goes inside the one child (a `Link`, a trigger of
 * Radix), and the child's own content in the label above it.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: Variant | null
  size?: Size | null
  asChild?: boolean
}) {
  const shape = { "data-slot": "button", "data-variant": variant ?? "default", "data-size": size ?? "default" }

  if (variant === "link") {
    const Comp = asChild ? Slot.Root : "button"
    return (
      <Comp
        {...shape}
        className={cn(
          "inline-flex items-center gap-1.5 font-text text-foreground underline decoration-brand decoration-1 underline-offset-4 hover:decoration-2 disabled:opacity-45",
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    )
  }

  const tall = size === "lg" || size === "icon-lg"
  const classes = controlClass({
    size: tall ? "md" : "sm",
    variant: (variant ?? "default") === "default" ? "primary" : "ghost",
    icon: Boolean(size?.startsWith("icon")),
    className,
  })
  const frame = <HoloFrame seed={textOf(children) || String(props["aria-label"] ?? "")} />

  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }>
    return (
      <Slot.Root {...shape} data-holo="" className={classes} {...props}>
        {frame}
        <Slot.Slottable>
          {React.cloneElement(child, undefined, <span className={styles.label}>{child.props.children}</span>)}
        </Slot.Slottable>
      </Slot.Root>
    )
  }

  return (
    <button {...shape} data-holo="" className={classes} {...props}>
      {frame}
      <span className={styles.label}>{children}</span>
    </button>
  )
}

export { Button }
