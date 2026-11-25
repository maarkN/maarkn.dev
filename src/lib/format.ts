/**
 * Dates, money and numbers of the backoffice, in its language and time zone.
 *
 * Rule: never call `toLocaleString`/`toLocaleDateString` loose in a screen. The
 * server and the browser resolve different default locales and time zones, and
 * React reports a hydration mismatch. Here both are data: the server resolves
 * them once per request (src/lib/admin/request.ts) and hands the same two values
 * to the browser (src/components/admin/admin-locale.tsx). Dates are assembled
 * from their parts, because the punctuation around them changes from one version
 * of ICU to the next.
 *
 * ── Why two time zones ──────────────────────────────────────────────────────
 * The codebase stores two different things in the same `DateTime` column:
 *
 *   1. CALENDAR DATES (`appliedAt`, and everything that comes from the vault or
 *      an `<input type="date">`). They are built with `new Date("2026-08-04")`,
 *      which ECMAScript parses as **UTC midnight**. Rendering that instant in
 *      America/Sao_Paulo (UTC-3) yields 3 August, one day early, and
 *      `toDateInputValue` would then feed 2026-08-03 back into the form, so
 *      every save would walk the date backwards. Calendar dates are therefore
 *      formatted in **UTC**, whatever the configured zone is: it is the zone
 *      they were written in.
 *   2. REAL INSTANTS (`createdAt`, `updatedAt`, log timestamps). Those are
 *      genuine points in time and are shown in the **configured zone**.
 *
 * So: `formatDate`/`toDateInputValue` = UTC · `formatDateTime` = configured zone.
 * Use `formatDate` for a date the user typed, `formatDateTime` for a timestamp
 * the system generated.
 *
 * Every function is null-safe and returns `EMPTY` ("—") for missing input, so a
 * table cell can call it directly without a ternary.
 */

import type { AdminLocale } from "@/lib/admin/locale";
import { resolveTimeZone } from "@/lib/admin/time-zone";

/** Placeholder used for null/undefined/invalid values. */
export const EMPTY = "—";

/** Calendar dates are stored as UTC midnight — read them back in UTC. */
const CALENDAR_ZONE = "UTC";

type DateLike = string | number | Date | null | undefined;
type NumberLike = string | number | null | undefined;

/** What the formatters depend on; plain data, so it crosses to the browser. */
export type FormatSettings = { locale: AdminLocale; timeZone: string };

export type Format = {
  /** Calendar date (UTC): `04/08/2026`, `Aug 4, 2026`. Pairs with `toDateInputValue`. */
  formatDate: (value?: DateLike) => string;
  /** Instant, in the configured zone: `04/08/2026, 14:32`, `Aug 4, 2026, 14:32`. */
  formatDateTime: (value?: DateLike) => string;
  /** `R$ 1.500,00`, `R$1,500.00`. Accepts decimal strings (Prisma `Decimal`). */
  formatMoney: (value?: NumberLike, currency?: string) => string;
  /** `1.062`, `1,062`: plain grouped integer or decimal. */
  formatNumber: (value?: NumberLike) => string;
  /**
   * Rate stored as a decimal fraction → percent: `0.05` → `5%`.
   * Pass `{ alreadyScaled: true }` when the value is already 0–100.
   */
  formatPercent: (rate?: NumberLike, fractionDigits?: number, options?: { alreadyScaled?: boolean }) => string;
};

/** Coerce anything date-ish to a valid Date, or null. */
function toDate(value?: DateLike): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Coerce anything number-ish (incl. Prisma decimal strings) to a finite number, or null. */
function toNumber(value?: NumberLike): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** English months by name, so that 8/4 is never read as 8 April. */
const DATE_PARTS: Record<AdminLocale, Intl.DateTimeFormatOptions> = {
  en: { year: "numeric", month: "short", day: "numeric" },
  "pt-BR": { year: "numeric", month: "2-digit", day: "2-digit" },
};
const TAG: Record<AdminLocale, string> = { en: "en-US", "pt-BR": "pt-BR" };

function build({ locale, timeZone }: FormatSettings): Format {
  const tag = TAG[locale];
  const calendar = new Intl.DateTimeFormat(tag, { ...DATE_PARTS[locale], timeZone: CALENDAR_ZONE });
  const instant = new Intl.DateTimeFormat(tag, {
    ...DATE_PARTS[locale],
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    // A browser may not know a zone the server knows: better an approximate time than no screen.
    timeZone: resolveTimeZone(timeZone),
  });
  const number = new Intl.NumberFormat(tag);

  const parts = (format: Intl.DateTimeFormat, date: Date) =>
    Object.fromEntries(format.formatToParts(date).map(({ type, value }) => [type, value]));
  const day = ({ year, month, day }: Record<string, string>) =>
    locale === "en" ? `${month} ${day}, ${year}` : `${day}/${month}/${year}`;

  /** Money is multi-currency here (BRL, CAD, EUR, USD): one formatter per currency, on demand. */
  const currencies = new Map<string, Intl.NumberFormat>();
  const currency = (code: string) => {
    const key = code.toUpperCase();
    const known = currencies.get(key) ?? new Intl.NumberFormat(tag, { style: "currency", currency: key });
    currencies.set(key, known);
    return known;
  };

  return {
    formatDate(value) {
      const date = toDate(value);
      return date ? day(parts(calendar, date)) : EMPTY;
    },
    formatDateTime(value) {
      const date = toDate(value);
      if (!date) return EMPTY;
      const at = parts(instant, date);
      return `${day(at)}, ${at.hour}:${at.minute}`;
    },
    formatMoney(value, code = "BRL") {
      const n = toNumber(value);
      return n === null ? EMPTY : currency(code).format(n);
    },
    formatNumber(value) {
      const n = toNumber(value);
      return n === null ? EMPTY : number.format(n);
    },
    formatPercent(rate, fractionDigits = 2, options) {
      const n = toNumber(rate);
      if (n === null) return EMPTY;
      const scaled = options?.alreadyScaled ? n : n * 100;
      return `${new Intl.NumberFormat(tag, {
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
      }).format(scaled)}%`;
    },
  };
}

const built = new Map<string, Format>();

/** The formatters of a language and a time zone. The same settings get the same object. */
export function createFormat(settings: FormatSettings): Format {
  const key = `${settings.locale} ${settings.timeZone}`;
  const known = built.get(key) ?? build(settings);
  built.set(key, known);
  return known;
}

/** `en-CA` yields ISO-ordered parts (YYYY-MM-DD) for free. */
const dateInputFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: CALENDAR_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * `2026-08-04` — the value shape `<input type="date">` requires, in any language.
 *
 * Exact inverse of `new Date("2026-08-04")` (UTC midnight), so an edit form
 * round-trips a date without shifting it. Returns "" when there is no date, so
 * it can be dropped straight into `defaultValue`.
 */
export function toDateInputValue(value?: DateLike): string {
  const d = toDate(value);
  return d ? dateInputFmt.format(d) : "";
}
