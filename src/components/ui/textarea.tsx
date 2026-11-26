import * as React from "react"

import styles from "@/components/holo/holo.module.css"
import { FieldBox } from "./input"

/** A long place to write: the frame of `Input`, growing with what is written. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <FieldBox className={className} invalid={props["aria-invalid"]} disabled={props.disabled} seed={props.name ?? props.id}>
      <textarea data-slot="textarea" className={`${styles.input} field-sizing-content`} {...props} />
    </FieldBox>
  )
}

export { Textarea }
