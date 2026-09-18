/**
 * pt-BR formatting helpers for the backoffice (dates, money, plain numbers).
 *
 * Rule: never call `toLocaleString`/`toLocaleDateString` loose in a page — the
 * server and the browser resolve different default locales/time zones and Next
 * throws a hydration mismatch. Every formatter here pins both, so a value
 * rendered on the server matches the one rendered on the client.
 *
 * ── Why two time zones ──────────────────────────────────────────────────────
 * The codebase stores two different things in the same `DateTime` column:
 *
 *   1. CALENDAR DATES (`appliedAt`, and everything that comes from the vault or
 *      an `<input type="date">`). They are built with `new Date("2026-08-04")`,
 *      which ECMAScript parses as **UTC midnight**. Rendering that instant in
 *      America/Sao_Paulo (UTC-3) yields 03/08/2026 — one day early — and
 *      `toDateInputValue` would then feed 2026-08-03 back into the form, so
 *      every save would walk the date backwards. Calendar dates are therefore
 *      formatted in **UTC**: it is the zone they were written in.
 *   2. REAL INSTANTS (`createdAt`, `updatedAt`, log timestamps). Those are
 *      genuine points in time and are shown in **America/Sao_Paulo**, where the
 *      operator is.
 *
 * So: `formatDate`/`toDateInputValue` = UTC · `formatDateTime` = São Paulo.
 * Use `formatDate` for a date the user typed, `formatDateTime` for a timestamp
 * the system generated.
 *
 * Every function is null-safe and returns `EMPTY` ("—") for missing input, so a
 * table cell can call it directly without a ternary.
 */

/** Placeholder used for null/undefined/invalid values. */
export const EMPTY = "—";

/** Calendar dates are stored as UTC midnight — read them back in UTC. */
const DATE_TZ = "UTC";
/** Real timestamps are shown where the operator is. */
const TIME_TZ = "America/Sao_Paulo";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: DATE_TZ,
});

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: TIME_TZ,
});

/** `en-CA` yields ISO-ordered parts (YYYY-MM-DD) for free. */
const dateInputFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: DATE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const numberFmt = new Intl.NumberFormat("pt-BR");

/**
 * Money is multi-currency here (BRL, CAD, EUR, USD — the job hunt spans
 * markets), so currency formatters are built on demand and memoized.
 */
const currencyFmts = new Map<string, Intl.NumberFormat>();

function currencyFmt(currency: string): Intl.NumberFormat {
  const key = currency.toUpperCase();
  let fmt = currencyFmts.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: key });
    currencyFmts.set(key, fmt);
  }
  return fmt;
}

/** Coerce anything date-ish to a valid Date, or null. */
function toDate(value?: string | number | Date | null): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Coerce anything number-ish (incl. Prisma decimal strings) to a finite number, or null. */
function toNumber(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** `04/08/2026` — calendar date (UTC). Pairs with `toDateInputValue`. */
export function formatDate(value?: string | number | Date | null): string {
  const d = toDate(value);
  return d ? dateFmt.format(d) : EMPTY;
}

/** `04/08/2026 14:32` — real timestamp, in America/Sao_Paulo. */
export function formatDateTime(value?: string | number | Date | null): string {
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : EMPTY;
}

/**
 * `R$ 1.500,00` / `CA$ 130.000,00`. Accepts numbers or decimal strings
 * (Prisma `Decimal` serializes as a string).
 */
export function formatMoney(
  value?: string | number | null,
  currency = "BRL",
): string {
  const n = toNumber(value);
  return n === null ? EMPTY : currencyFmt(currency).format(n);
}

/** `1.062` — plain grouped integer/decimal. */
export function formatNumber(value?: string | number | null): string {
  const n = toNumber(value);
  return n === null ? EMPTY : numberFmt.format(n);
}

/**
 * Rate stored as a decimal fraction → percent: `0.05` → `5%`.
 * Pass `{ alreadyScaled: true }` when the value is already 0–100.
 */
export function formatPercent(
  rate?: string | number | null,
  fractionDigits = 2,
  options?: { alreadyScaled?: boolean },
): string {
  const n = toNumber(rate);
  if (n === null) return EMPTY;
  const scaled = options?.alreadyScaled ? n : n * 100;
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(scaled)}%`;
}

/**
 * `2026-08-04` — the value shape `<input type="date">` requires.
 *
 * Exact inverse of `new Date("2026-08-04")` (UTC midnight), so an edit form
 * round-trips a date without shifting it. Returns "" when there is no date, so
 * it can be dropped straight into `defaultValue`.
 */
export function toDateInputValue(
  value?: string | number | Date | null,
): string {
  const d = toDate(value);
  return d ? dateInputFmt.format(d) : "";
}
