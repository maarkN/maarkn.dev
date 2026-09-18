/**
 * Return contract of every Server Action consumed by the backoffice UI.
 *
 * See `src/app/admin/AGENTS.md` §2. Rules that matter:
 * - never `throw` from an action the UI awaits (the error becomes a generic
 *   error screen and the toast is lost) — catch, log on the server, return
 *   `{ ok: false, message }`;
 * - `message` is pt-BR text ready to drop into `toast.success` / `toast.error`;
 * - never leak internals (stack, SQL, another user's e-mail) through `message`;
 * - `fieldErrors` is `{ [field name]: message }`, built from a zod issue list.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
