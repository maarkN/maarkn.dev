export type ParsedInput = {
  /** First token, as typed (case preserved for error messages). */
  name: string;
  args: string[];
};

/** Whitespace tokenizer; no quoting, like the mockup. */
export function tokenize(raw: string): string[] {
  const trimmed = raw.trim();
  return trimmed ? trimmed.split(/\s+/) : [];
}

/** `null` for blank input. */
export function parse(raw: string): ParsedInput | null {
  const [name, ...args] = tokenize(raw);
  return name ? { name, args } : null;
}
