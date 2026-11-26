/**
 * Output languages accepted by `generate()` in `src/app/_actions/generator.ts`
 * (`z.enum(["en", "pt-BR"])`). Shared by the form's select and by the table of
 * recent generations, so the two never drift; the words are in the dictionary
 * (`admin.vocab.generatorLanguage`).
 *
 * Plain data module (no JSX, no server-only): safe on both sides.
 */

export const GENERATOR_LANGUAGES = ["en", "pt-BR"] as const;

export type GeneratorLanguage = (typeof GENERATOR_LANGUAGES)[number];

/** The word of a known language, or the raw key: an unknown value never renders blank. */
export function languageLabel(words: Record<GeneratorLanguage, string>, value: string): string {
  return (words as Record<string, string>)[value] ?? value;
}
