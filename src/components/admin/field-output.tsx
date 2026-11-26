/**
 * What surrounds a field of the backoffice: its help, the word that says it is
 * required, and its error. One module, because their accessibility is the easy
 * part to get wrong, and getting it wrong once per form is getting it wrong a
 * dozen times.
 *
 * - The label is plain text and is the accessible name (`<Label htmlFor>`).
 *   `(obrigatório)` goes INSIDE it, so the name is exactly what is seen; a lone
 *   `*` would be read as "asterisk" or swallowed.
 * - Help and error have ids, which the field points to with `aria-describedby`
 *   (`describedBy`). The error says what happened and how to fix it, and is an
 *   alert: it is announced when it appears. Its colour is the icon's; the words
 *   are ink, legible on every surface of the three themes.
 *
 * Server-safe: `RequiredHint` is the one piece that reads the language of the
 * screen, and is a client component of its own.
 */

import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export { RequiredHint } from "./required-hint";

/**
 * The `aria-describedby` of a field, from the ids that are on screen. `undefined`
 * (not an empty string) when there is none, so the attribute is left out.
 */
export function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  const present = ids.filter((id): id is string => Boolean(id));
  return present.length > 0 ? present.join(" ") : undefined;
}

/** What the field is for, or what it takes. */
export function FieldHelp({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <p id={id} className={cn("font-text text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

/**
 * The error of a field, or of the whole form. Nothing without a message, so a
 * call site can pass the value as it is.
 */
export function FieldError({ id, className, children }: { id?: string; className?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className={cn("flex items-start gap-1.5 font-text text-sm text-foreground", className)}>
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
      <span>{children}</span>
    </p>
  );
}
