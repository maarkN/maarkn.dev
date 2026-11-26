/**
 * The two things a sentence of the dictionary needs before it is shown: its
 * blanks filled, and the form that agrees with a number. Pure; the server and
 * the browser write the same.
 */

/** `"Página {page} de {pages}"` → `"Página 2 de 4"`. A blank with no value stays as it is. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (blank, key: string) => (key in values ? String(values[key]) : blank));
}

/** One of two forms, by the number, with `{count}` filled by the number as written for the reader. */
export function counted(forms: { one: string; many: string }, count: number, written: string = String(count)): string {
  return fill(count === 1 ? forms.one : forms.many, { count: written });
}
