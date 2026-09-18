import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateRequest, wwwAuthenticateHeader } from "@/lib/mcp/auth";
import {
  finishAudit,
  recordDenied,
  startAudit,
  type AuditStart,
} from "@/lib/mcp/audit";
import {
  clientIp,
  consumeIpBudget,
  consumeKeyBudget,
} from "@/lib/mcp/rate-limit";
import {
  describeJsonRpcCall,
  findForbiddenArgument,
  isAllowedOrigin,
} from "@/lib/mcp/guards";
import { safeErrorMessage } from "@/lib/mcp/redact";
import { buildMcpServer } from "@/lib/mcp/server";

/**
 * Servidor MCP — transporte **Streamable HTTP**, autenticado por
 * `Authorization: Bearer <chave>`.
 *
 * Esta e a superficie mais perigosa do projeto: e a UNICA porta de escrita do
 * backoffice, expoe o funil de carreira inteiro, roda numa instancia so, e o
 * codigo-fonte e publico. Toda decisao aqui assume que o atacante leu este
 * arquivo.
 *
 * ---------------------------------------------------------------------------
 * Ordem das checagens (nao reordene sem pensar em cada uma)
 * ---------------------------------------------------------------------------
 *   1. metodo             — so POST. GET/DELETE respondem 405.
 *   2. rate limit por IP  — PRIMEIRO de todos, e antes de autenticar: e o que
 *                           torna caro varrer o endpoint com chave inventada e
 *                           o que impede que uma recusa custe uma linha de
 *                           auditoria por pacote (ver `firstBreach`).
 *   3. Origin             — allowlist. Fecha DNS rebinding e CSRF de navegador.
 *   4. autenticacao       — timing-safe, fail-closed (`src/lib/mcp/auth.ts`).
 *   5. rate limit da chave— cota propria, ja identificada.
 *   6. tamanho do corpo   — leitura com teto real, nao so `Content-Length`.
 *   7. JSON + guard de argumento proibido (`visibility`) no payload CRU.
 *   8. execucao           — `McpServer` novo por requisicao, stateless.
 *
 * Toda recusa vira linha em `McpAuditLog` com `status = "denied"` e uma
 * `reason` estavel — EXCETO as recusas por excesso de cota depois da primeira
 * da janela, que so incrementam o contador de `McpRateLimit`. Sem esse teto,
 * um flood anonimo enche a tabela de auditoria e o disco do Postgres.
 *
 * ---------------------------------------------------------------------------
 * Por que stateless (`sessionIdGenerator: undefined`)
 * ---------------------------------------------------------------------------
 * Sessao com estado exigiria manter transportes vivos em memoria entre
 * requisicoes — que morre no primeiro restart, nao sobrevive a duas replicas, e
 * cria um mapa global compartilhado entre chaves diferentes. Como toda tool
 * daqui e um upsert idempotente (nao ha operacao com estado entre chamadas),
 * stateless nao custa nada e elimina a classe de bug inteira.
 * `enableJsonResponse: true` porque nenhuma tool faz streaming: a resposta sai
 * como um JSON unico e a requisicao termina.
 */

export const runtime = "nodejs";
/** Nunca cacheado, nunca pre-renderizado: toca banco e le header de auth. */
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = (() => {
  const raw = process.env.MCP_MAX_BODY_BYTES;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 4 * 1024 * 1024; // 4 MiB
})();

const SECURITY_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function jsonRpcError(
  status: number,
  code: number,
  message: string,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...SECURITY_HEADERS,
        ...extraHeaders,
      },
    }
  );
}

/** Copia a resposta do transporte acrescentando os headers de seguranca. */
function harden(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Le o corpo com teto REAL de bytes. `Content-Length` sozinho nao serve: e um
 * header, e com `Transfer-Encoding: chunked` ele nem existe. Aqui o stream e
 * abortado assim que passa do limite, sem bufferizar o resto.
 */
async function readBodyLimited(
  request: Request,
  maxBytes: number
): Promise<{ ok: true; text: string } | { ok: false; reason: "too_large" }> {
  const declared = request.headers.get("content-length");
  if (declared) {
    const n = Number.parseInt(declared, 10);
    if (Number.isFinite(n) && n > maxBytes) return { ok: false, reason: "too_large" };
  }

  const body = request.body;
  if (!body) return { ok: true, text: "" };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder("utf-8").decode(merged) };
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const ip = clientIp(request);
  const userAgent = request.headers.get("user-agent");

  /** Base de auditoria antes de saber qual chave e (e se e alguma). */
  const httpBase: AuditStart = {
    apiKeyId: null,
    keyPrefix: null,
    tool: "<http>",
    ip,
    userAgent,
  };

  // 2. Rate limit por IP, ANTES de qualquer escrita em `McpAuditLog`.
  //    Esta e a primeira checagem de proposito: toda recusa abaixo grava uma
  //    linha de auditoria, e auditar antes de limitar transformaria um flood
  //    anonimo num `INSERT` por pacote — o atacante gasta banda, o servidor
  //    gasta disco no mesmo Postgres que guarda o funil inteiro.
  const ipBudget = await consumeIpBudget(ip);
  if (!ipBudget.ok) {
    // Uma linha por balde/janela, nao uma por requisicao. A contagem real da
    // rajada continua visivel em `McpRateLimit` (que e UPDATE, nao INSERT).
    if (ipBudget.firstBreach) {
      await recordDenied({
        ...httpBase,
        reason: ipBudget.reason === "rate_limited" ? "rate_limited" : "unavailable",
        latencyMs: Date.now() - startedAt,
      });
    }
    return jsonRpcError(
      ipBudget.reason === "rate_limited" ? 429 : 503,
      -32000,
      ipBudget.reason === "rate_limited"
        ? "Limite de requisicoes por IP atingido."
        : "Servidor MCP indisponivel.",
      { "Retry-After": String(ipBudget.retryAfterSeconds) }
    );
  }

  // 3. Origin: cliente MCP nativo nao manda; navegador sempre manda.
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    await recordDenied({
      ...httpBase,
      args: { origin: origin?.slice(0, 200) },
      reason: "bad_origin",
      latencyMs: Date.now() - startedAt,
    });
    return jsonRpcError(403, -32000, "Origem nao permitida.");
  }

  // 4. Autenticacao.
  const authResult = await authenticateRequest(request);
  if (!authResult.ok) {
    await recordDenied({
      ...httpBase,
      keyPrefix: authResult.keyPrefix,
      reason: authResult.reason,
      latencyMs: Date.now() - startedAt,
    });
    return jsonRpcError(authResult.status, -32001, authResult.message, {
      "WWW-Authenticate": wwwAuthenticateHeader(authResult.reason),
    });
  }
  const auth = authResult.auth;
  const keyBase: AuditStart = {
    ...httpBase,
    apiKeyId: auth.apiKeyId,
    keyPrefix: auth.keyPrefix,
  };

  // 5. Rate limit da chave.
  const keyBudget = await consumeKeyBudget(auth.apiKeyId);
  if (!keyBudget.ok) {
    if (keyBudget.firstBreach) {
      await recordDenied({
        ...keyBase,
        reason: keyBudget.reason === "rate_limited" ? "rate_limited" : "unavailable",
        latencyMs: Date.now() - startedAt,
      });
    }
    return jsonRpcError(
      keyBudget.reason === "rate_limited" ? 429 : 503,
      -32000,
      keyBudget.reason === "rate_limited"
        ? `Limite de requisicoes atingido (${keyBudget.label}).`
        : "Servidor MCP indisponivel.",
      { "Retry-After": String(keyBudget.retryAfterSeconds) }
    );
  }

  // Content-Type: o transporte tambem checa, mas nos precisamos parsear antes
  // dele para rodar o guard de argumento proibido.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.split(";")[0]!.trim().toLowerCase().startsWith("application/json")) {
    await recordDenied({
      ...keyBase,
      reason: "invalid_json",
      latencyMs: Date.now() - startedAt,
    });
    return jsonRpcError(415, -32000, "Content-Type deve ser application/json.");
  }

  // 6. Corpo com teto de bytes.
  const body = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!body.ok) {
    await recordDenied({
      ...keyBase,
      reason: "payload_too_large",
      latencyMs: Date.now() - startedAt,
    });
    return jsonRpcError(
      413,
      -32000,
      `Corpo maior que o limite de ${MAX_BODY_BYTES} bytes.`
    );
  }

  // 7. JSON + guard de argumento proibido.
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body.text);
  } catch {
    await recordDenied({
      ...keyBase,
      reason: "invalid_json",
      latencyMs: Date.now() - startedAt,
    });
    return jsonRpcError(400, -32700, "JSON invalido.");
  }

  const call = describeJsonRpcCall(parsedBody);

  const forbidden = findForbiddenArgument(parsedBody);
  if (forbidden) {
    // Recusa a requisicao INTEIRA, alto e ruidoso. Descartar o campo em
    // silencio faria o agente acreditar que a visibilidade foi aceita.
    await recordDenied({
      ...keyBase,
      tool: call.toolNames[0] ?? call.method,
      // So o CAMINHO ate a chave, nunca o valor: o payload recusado continua
      // sendo dado do vault e nao tem por que virar linha de log.
      args: { caminho: forbidden.path, chave: forbidden.key },
      reason: "forbidden_argument",
      latencyMs: Date.now() - startedAt,
    });
    return jsonRpcError(
      400,
      -32602,
      `Argumento proibido '${forbidden.key}' em ${forbidden.path}. Nenhuma tool deste ` +
        "servidor aceita visibilidade: tudo nasce private e a promocao para publico " +
        "e acao humana na UI do admin. Remova o campo e tente de novo."
    );
  }

  // 8. Execucao. Servidor e transporte novos, descartados no fim.
  const isToolCall = call.method.includes("tools/call");
  // Chamadas de tool sao auditadas uma a uma pelo wrapper de `server.ts`;
  // auditar tambem aqui duplicaria a linha. Os demais metodos do protocolo
  // (initialize, tools/list, ping) ganham a sua linha aqui.
  const protocolAuditId = isToolCall
    ? null
    : await startAudit({ ...keyBase, tool: `<${call.method}>` });

  const server = buildMcpServer({ auth, ip, userAgent });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request, {
      parsedBody,
      // O SDK propaga `authInfo` ate o handler. NUNCA coloque o token aqui:
      // `token` recebe o prefixo PUBLICO, que nao permite forjar nada e pode
      // aparecer em log sem consequencia.
      authInfo: {
        token: auth.keyPrefix,
        clientId: auth.apiKeyId,
        scopes: [...auth.scopes],
        ...(auth.expiresAt
          ? { expiresAt: Math.floor(auth.expiresAt.getTime() / 1000) }
          : {}),
      },
    });

    await finishAudit(protocolAuditId, {
      status: response.status < 400 ? "ok" : "error",
      result: { httpStatus: response.status },
      latencyMs: Date.now() - startedAt,
    });

    return harden(response);
  } catch (err) {
    const detail = safeErrorMessage(err);
    console.error("[mcp] falha no transporte:", detail);
    await finishAudit(protocolAuditId, {
      status: "error",
      reason: "internal_error",
      result: { erro: detail },
      latencyMs: Date.now() - startedAt,
    });
    return jsonRpcError(500, -32603, "Erro interno do servidor MCP.");
  } finally {
    // Fecha servidor e transporte da requisicao. Em modo JSON o corpo ja foi
    // materializado antes de `handleRequest` resolver, entao fechar aqui nao
    // corta resposta nenhuma.
    await server.close().catch((err: unknown) => {
      console.error("[mcp] falha ao fechar servidor:", safeErrorMessage(err));
    });
  }
}

/**
 * Este servidor nao oferece o stream SSE independente (GET) nem terminacao de
 * sessao (DELETE) — nao ha sessao para terminar e nenhuma tool envia
 * notificacao fora do ciclo de resposta. A especificacao do Streamable HTTP
 * permite 405 nesses casos, e responder 405 explicitamente e melhor do que
 * deixar o cliente esperando um stream que nunca vem.
 */
function methodNotAllowed(): Response {
  return jsonRpcError(405, -32000, "Metodo nao permitido. Use POST.", {
    Allow: "POST",
  });
}

export function GET(): Response {
  return methodNotAllowed();
}

export function DELETE(): Response {
  return methodNotAllowed();
}

export function PUT(): Response {
  return methodNotAllowed();
}

export function PATCH(): Response {
  return methodNotAllowed();
}
