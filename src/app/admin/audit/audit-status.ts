/**
 * `McpAuditLog.status` / `.reason` → rótulos da UI.
 *
 * Os valores canônicos vivem em `src/lib/mcp/audit.ts` (`AuditStatus`,
 * `AuditReason`), que é `server-only`: este módulo repete as chaves como
 * strings em vez de importá-las, para poder ser lido também pela toolbar
 * cliente. Duplicação consciente e barata — se um motivo novo aparecer sem
 * rótulo aqui, o código cru é exibido, nunca um erro.
 *
 * Sobre `running`: a linha nasce `running` ANTES da execução (a auditoria é
 * fail-closed — sem linha, sem tool). Um `running` que nunca fechou não é
 * ruído: é uma chamada que travou, estourou ou derrubou o processo.
 */

import type { StatusStyles } from "@/components/admin/status-badge";

export const AUDIT_STATUS_STYLES: StatusStyles = {
  ok: {
    label: "OK",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  running: {
    label: "Em curso",
    className: "bg-slate-500/15 text-slate-300",
  },
  denied: {
    label: "Recusada",
    className: "bg-amber-500/15 text-amber-300",
  },
  error: {
    label: "Erro",
    className: "bg-red-500/15 text-red-300",
  },
};

export function isAuditStatus(value: string): boolean {
  return Object.hasOwn(AUDIT_STATUS_STYLES, value);
}

/** `McpAuditLog.reason` → texto pt-BR. Chaves = `AuditReason` de `lib/mcp/audit.ts`. */
export const AUDIT_REASON_LABELS: Record<string, string> = {
  // autenticação
  missing_header: "sem header Authorization",
  malformed_header: "Authorization malformado",
  malformed_key: "chave fora do formato",
  unknown_key: "chave inexistente",
  revoked: "chave revogada",
  expired: "chave expirada",
  no_scopes: "chave sem escopos válidos",
  server_misconfigured: "servidor mal configurado (pepper ausente)",
  unavailable: "servidor indisponível",
  // autorização / protocolo
  missing_scope: "escopo insuficiente",
  unknown_tool: "tool inexistente",
  invalid_arguments: "argumentos inválidos",
  forbidden_argument: "argumento proibido (visibility)",
  payload_too_large: "payload grande demais",
  invalid_json: "JSON inválido",
  bad_origin: "Origin de navegador recusada",
  method_not_allowed: "método HTTP não permitido",
  rate_limited: "rate limit estourado",
  audit_unavailable: "auditoria indisponível",
  // execução
  tool_error: "erro de negócio na tool",
  internal_error: "erro interno",
};

export function auditReasonLabel(reason: string): string {
  return AUDIT_REASON_LABELS[reason] ?? reason;
}
