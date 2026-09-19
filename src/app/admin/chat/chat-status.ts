/**
 * `ChatLog.status` → badge styles. Colocated with the screen (it is the only
 * consumer) instead of `components/admin/status-badge.tsx`, which is reserved
 * for the enums shared across the backoffice.
 *
 * The import below is type-only, so this module stays a plain object at runtime
 * and the client toolbar can import it without dragging the badge tree along.
 *
 * Values come from `src/lib/chat-log.ts`: a row is written as `pending` before
 * the stream starts and updated to `ok` | `mock` | `error` when it ends —
 * `pending` therefore means the stream never finished.
 */

import type { StatusStyles } from "@/components/admin/status-badge";

export const CHAT_STATUS_STYLES: StatusStyles = {
  ok: {
    label: "OK",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  mock: {
    label: "Mock",
    className: "bg-slate-500/15 text-slate-300",
  },
  pending: {
    label: "Pendente",
    className: "bg-amber-500/15 text-amber-300",
  },
  error: {
    label: "Erro",
    className: "bg-red-500/15 text-red-300",
  },
};
