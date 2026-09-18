/**
 * Output languages accepted by `generate()` in `src/app/_actions/generator.ts`
 * (`z.enum(["en", "pt-BR"])`). Shared by the form's select and by the recent
 * generations table, so the two never drift.
 *
 * Plain data module (no JSX, no server-only) — safe on both sides.
 */

export const GENERATOR_LANGUAGES = [
  { value: "en", label: "Inglês" },
  { value: "pt-BR", label: "Português (BR)" },
] as const;

export type GeneratorLanguage = (typeof GENERATOR_LANGUAGES)[number]["value"];

/** Falls back to the raw key, so an unknown value never renders blank. */
export function languageLabel(value: string): string {
  return GENERATOR_LANGUAGES.find((l) => l.value === value)?.label ?? value;
}
