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

/**
 * The reasons the MCP server writes (`src/lib/mcp/**`): authentication,
 * authorisation and protocol, execution. They have words; an unknown one shows
 * as it is.
 */
export const AUDIT_REASONS = [
  "missing_header",
  "malformed_header",
  "malformed_key",
  "unknown_key",
  "revoked",
  "expired",
  "no_scopes",
  "server_misconfigured",
  "unavailable",
  "missing_scope",
  "unknown_tool",
  "invalid_arguments",
  "forbidden_argument",
  "payload_too_large",
  "invalid_json",
  "bad_origin",
  "method_not_allowed",
  "rate_limited",
  "audit_unavailable",
  "tool_error",
  "internal_error",
] as const;

export function auditReasonLabel(words: Record<string, string>, reason: string): string {
  return words[reason] ?? reason;
}
