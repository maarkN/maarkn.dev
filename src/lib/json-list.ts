/**
 * Tiny helpers around JSON-encoded array columns we use because SQLite has
 * no native JSON type via Prisma. Keeps the encoding/decoding centralized
 * and forgiving — bad JSON falls back to an empty array instead of crashing.
 */
export function encodeStringList(items: readonly string[]): string {
  return JSON.stringify(items);
}

export function decodeStringList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}
