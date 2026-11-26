import * as React from "react"

import { HoloFrame } from "@/components/holo/frame"
import styles from "@/components/holo/holo.module.css"
import { cn } from "@/lib/utils"

/** Types the browser draws a control of its own for: no frame around them. */
const NATIVE = new Set(["hidden", "checkbox", "radio", "file", "range", "color"])

/**
 * A place to write is a hologram (docs/design/moldura.md): solid inside, framed,
 * the frame closing and turning `--beam-3` with the focus and `--bad` while the
 * field is `aria-invalid`. `className` sizes the frame, which is the box; the
 * field fills it.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  if (type && NATIVE.has(type)) {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "w-full min-w-0 font-text text-sm text-foreground file:mr-3 file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:font-text file:text-foreground disabled:opacity-45",
          className
        )}
        {...props}
      />
    )
  }
  return (
    <FieldBox className={className} invalid={props["aria-invalid"]} disabled={props.disabled} seed={props.name ?? props.id}>
      <input type={type} data-slot="input" className={styles.input} {...props} />
    </FieldBox>
  )
}

/** The frame of a field, shared by `Input` and `Textarea`. */
function FieldBox({
  className,
  invalid,
  disabled,
  seed,
  children,
}: {
  className?: string
  invalid?: React.AriaAttributes["aria-invalid"]
  disabled?: boolean
  seed?: string
  children: React.ReactNode
}) {
  const marked = invalid === true || invalid === "true"
  return (
    <span
      data-slot="field-box"
      data-holo=""
      data-invalid={marked ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={cn(styles.holo, styles.fieldBox, "admin-field", className)}
    >
      <HoloFrame seed={seed || "field"} />
      {children}
    </span>
  )
}

export { FieldBox, Input }
