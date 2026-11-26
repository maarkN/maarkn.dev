/**
 * `McpAuditLog.status` and `reason`. The words are in the dictionary
 * (`admin.vocab.auditStatus`, `admin.vocab.auditReason`); an unknown reason
 * shows as it is.
 */

export const AUDIT_STATUSES = ["ok", "running", "denied", "error"] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export function isAuditStatus(value: string): value is AuditStatus {
  return (AUDIT_STATUSES as readonly string[]).includes(value);
}

/** The colour of the mark next to the word: a second channel, never the only one. */
export const AUDIT_STATUS_TONES: Record<AuditStatus, string> = {
  ok: "bg-ok",
  running: "bg-ink-3",
  denied: "bg-warn",
  error: "bg-destructive",
};

export function auditReasonLabel(words: Record<string, string>, reason: string): string {
  return words[reason] ?? reason;
}
