/** The time zone the backoffice shows instants in; chosen in Configurações. */

export const ADMIN_TIME_ZONE_COOKIE = "admin-time-zone";
export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

/** The zone as the runtime spells it (`america/sao_paulo` → `America/Sao_Paulo`), or `null`. */
export function knownTimeZone(value: unknown): string | null {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9_+\-/]{1,63}$/.test(value)) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/** An unknown or missing choice is São Paulo; it is never an error. */
export function resolveTimeZone(saved: unknown): string {
  return knownTimeZone(saved) ?? DEFAULT_TIME_ZONE;
}

/** What the field suggests. */
export function timeZones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}
