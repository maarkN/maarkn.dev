import "server-only";
import { db, dbConfigured } from "@/lib/db";
import { safeErrorMessage, summarizeForAudit, redactText } from "@/lib/mcp/redact";

/**
 * Auditoria do servidor MCP (`McpAuditLog`).
 *
 * Duas regras que definem o desenho deste arquivo:
 *
 * 1. **Grava ANTES de executar.** Uma auditoria escrita so no fim perde
 *    exatamente o caso interessante — a chamada que travou, estourou memoria,
 *    derrubou o processo ou ficou pendurada num upstream. A linha nasce com
 *    `status = "running"` e e atualizada depois. Se o processo morrer no meio,
 *    fica um `running` orfao: sinal, nao ruido.
 *
 * 2. **Sem auditoria, sem execucao (fail-closed).** Se a linha nao pode ser
 *    escrita, a tool nao roda. O MCP e a unica porta de escrita do sistema e o
 *    agente do outro lado e nao deterministico: aceitar uma escrita que ninguem
 *    consegue rastrear derrubaria tambem o rollback por rodada (`SyncRun` +
 *    `Provenance`), que depende de saber o que foi feito. Na pratica a
 *    condicao quase nao existe: a auditoria usa o mesmo banco que as tools.
 *
 * As recusas TAMBEM viram linha (`status = "denied"`). Sem elas nao ha como
 * enxergar varredura: chave inexistente, chave revogada, escopo errado e
 * excesso de rate limit sao justamente o que se quer ver num grafico.
 */

/** Recusa possivel, gravada em `McpAuditLog.reason`. Codigo estavel. */
export type AuditReason =
  // autenticacao
  | "missing_header"
  | "malformed_header"
  | "malformed_key"
  | "unknown_key"
  | "revoked"
  | "expired"
  | "no_scopes"
  | "server_misconfigured"
  | "unavailable"
  // autorizacao / protocolo
  | "missing_scope"
  | "unknown_tool"
  | "invalid_arguments"
  | "forbidden_argument"
  | "payload_too_large"
  | "invalid_json"
  | "bad_origin"
  | "method_not_allowed"
  | "rate_limited"
  | "audit_unavailable"
  // execucao
  | "tool_error"
  | "internal_error";

export type AuditStatus = "running" | "ok" | "error" | "denied";

export type AuditStart = {
  apiKeyId: string | null;
  keyPrefix: string | null;
  /** Nome da tool, metodo JSON-RPC, ou "<http>" quando a recusa e anterior ao parse. */
  tool: string;
  /** Argumentos crus — passam por redacao e truncamento aqui dentro. */
  args?: unknown;
  ip: string | null;
  userAgent: string | null;
};

export type AuditFinish = {
  status: Exclude<AuditStatus, "running">;
  reason?: AuditReason;
  /** Resumo do resultado; redigido e truncado aqui dentro. */
  result?: unknown;
  latencyMs: number;
};

const MAX_RESULT_CHARS = 1000;
const MAX_TOOL_CHARS = 120;
const MAX_UA_CHARS = 200;

function trimTool(tool: string): string {
  return redactText(tool).slice(0, MAX_TOOL_CHARS) || "<desconhecido>";
}

/**
 * Cria a linha de auditoria antes da execucao.
 *
 * Devolve o id da linha, ou `null` se nao foi possivel gravar. **`null`
 * significa NEGAR a chamada** — quem chama nao deve seguir em frente.
 */
export async function startAudit(entry: AuditStart): Promise<string | null> {
  if (!dbConfigured) return null;
  try {
    const row = await db.mcpAuditLog.create({
      data: {
        apiKeyId: entry.apiKeyId,
        keyPrefix: entry.keyPrefix,
        tool: trimTool(entry.tool),
        argsSummary: entry.args === undefined ? null : summarizeForAudit(entry.args),
        status: "running",
        ip: entry.ip,
        userAgent: entry.userAgent?.slice(0, MAX_UA_CHARS) ?? null,
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    console.error("[mcp] falha ao abrir auditoria:", safeErrorMessage(err));
    return null;
  }
}

/**
 * Fecha a linha aberta por `startAudit`. Best-effort: a chamada ja aconteceu,
 * e falhar aqui nao deve transformar um sucesso em erro para o cliente. O
 * `running` orfao que sobra e o rastro do problema.
 */
export async function finishAudit(
  auditId: string | null,
  finish: AuditFinish
): Promise<void> {
  if (!auditId || !dbConfigured) return;
  try {
    await db.mcpAuditLog.update({
      where: { id: auditId },
      data: {
        status: finish.status,
        reason: finish.reason ?? null,
        result:
          finish.result === undefined
            ? null
            : summarizeForAudit(finish.result, MAX_RESULT_CHARS),
        latencyMs: Math.max(0, Math.round(finish.latencyMs)),
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[mcp] falha ao fechar auditoria:", safeErrorMessage(err));
  }
}

/**
 * Registra uma recusa em uma linha so (nao ha o que "terminar": nada rodou).
 * Best-effort — negar e a prioridade, registrar vem logo depois. Se nem isso
 * funcionar, o `console.error` abaixo e a ultima linha de defesa.
 */
export async function recordDenied(
  entry: AuditStart & { reason: AuditReason; latencyMs?: number }
): Promise<void> {
  if (!dbConfigured) {
    console.error(`[mcp] recusa nao auditada (${entry.reason}): sem DATABASE_URL`);
    return;
  }
  try {
    await db.mcpAuditLog.create({
      data: {
        apiKeyId: entry.apiKeyId,
        keyPrefix: entry.keyPrefix,
        tool: trimTool(entry.tool),
        argsSummary: entry.args === undefined ? null : summarizeForAudit(entry.args),
        status: "denied",
        reason: entry.reason,
        latencyMs: Math.max(0, Math.round(entry.latencyMs ?? 0)),
        ip: entry.ip,
        userAgent: entry.userAgent?.slice(0, MAX_UA_CHARS) ?? null,
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(
      `[mcp] falha ao auditar recusa (${entry.reason}):`,
      safeErrorMessage(err)
    );
  }
}
