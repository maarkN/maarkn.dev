import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O que este arquivo protege: um POST JSON-RPC em batch custa UMA unidade nos
 * gates de rate limit (60/min por IP, 120/min por chave), mas pode carregar
 * milhares de `tools/call`. Sem teto de mensagens, uma chave valida — ainda
 * que so de leitura — transforma um POST em ~40.000 chamadas em serie. O teto
 * precisa ser aplicado ANTES do despacho: se o transporte for construido, o
 * trabalho ja foi aceito.
 */

const mocks = vi.hoisted(() => {
  const handleRequest = vi.fn(
    async () =>
      new Response(JSON.stringify({ jsonrpc: "2.0", result: {}, id: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
  );
  return {
    handleRequest,
    serverConnect: vi.fn(async () => {}),
    serverClose: vi.fn(async () => {}),
    buildMcpServer: vi.fn(),
    recordDenied: vi.fn(async () => {}),
    startAudit: vi.fn(async () => "audit-1"),
    finishAudit: vi.fn(async () => {}),
    consumeIpBudget: vi.fn(async () => ({ ok: true })),
    consumeKeyBudget: vi.fn(async () => ({ ok: true })),
  };
});

const {
  handleRequest,
  serverConnect,
  serverClose,
  buildMcpServer,
  recordDenied,
  consumeIpBudget,
  consumeKeyBudget,
} = mocks;

vi.mock("server-only", () => ({}));

vi.mock("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js", () => ({
  WebStandardStreamableHTTPServerTransport: class {
    handleRequest = mocks.handleRequest;
  },
}));

vi.mock("@/lib/mcp/auth", () => ({
  authenticateRequest: vi.fn(async () => ({
    ok: true,
    auth: {
      apiKeyId: "key-1",
      keyPrefix: "mk_pub",
      scopes: ["read"],
      expiresAt: null,
    },
  })),
  wwwAuthenticateHeader: () => 'Bearer realm="mcp"',
}));

vi.mock("@/lib/mcp/audit", () => ({
  recordDenied: mocks.recordDenied,
  startAudit: mocks.startAudit,
  finishAudit: mocks.finishAudit,
}));

vi.mock("@/lib/mcp/rate-limit", () => ({
  clientIp: () => "198.51.100.7",
  consumeIpBudget: mocks.consumeIpBudget,
  consumeKeyBudget: mocks.consumeKeyBudget,
}));

vi.mock("@/lib/mcp/server", () => ({ buildMcpServer: mocks.buildMcpServer }));

import { POST } from "./route";

/** Igual ao teto padrao de `MAX_BATCH_MESSAGES` no route handler. */
const MAX_BATCH = 20;

function toolCall(id: number): unknown {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: "list_companies", arguments: {} },
  };
}

function post(body: unknown): Request {
  return new Request("https://maarkn.dev/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer x" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/mcp — teto de mensagens por requisicao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeIpBudget.mockResolvedValue({ ok: true });
    consumeKeyBudget.mockResolvedValue({ ok: true });
    handleRequest.mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: "2.0", result: {}, id: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    buildMcpServer.mockReturnValue({ connect: serverConnect, close: serverClose });
  });

  it("recusa 400 um batch acima do teto, sem despachar nada", async () => {
    const batch = Array.from({ length: MAX_BATCH + 1 }, (_, i) => toolCall(i));
    const response = await POST(post(batch));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: number; message: string } };
    expect(body.error.code).toBe(-32600);
    expect(body.error.message).toContain(String(MAX_BATCH + 1));

    // O ponto do achado: nem servidor nem transporte chegam a existir.
    expect(buildMcpServer).not.toHaveBeenCalled();
    expect(handleRequest).not.toHaveBeenCalled();

    expect(recordDenied).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "payload_too_large" })
    );
  });

  it("recusa o batch gigante da PoC (40.000 tools/call)", async () => {
    const batch = Array.from({ length: 40_000 }, (_, i) => toolCall(i));
    const response = await POST(post(batch));

    expect(response.status).toBe(400);
    expect(buildMcpServer).not.toHaveBeenCalled();
    expect(handleRequest).not.toHaveBeenCalled();
  });

  it("deixa passar um batch dentro do teto", async () => {
    const batch = Array.from({ length: MAX_BATCH }, (_, i) => toolCall(i));
    const response = await POST(post(batch));

    expect(response.status).toBe(200);
    expect(buildMcpServer).toHaveBeenCalledTimes(1);
    expect(handleRequest).toHaveBeenCalledTimes(1);
    expect(recordDenied).not.toHaveBeenCalled();
  });

  it("deixa passar a requisicao de mensagem unica (o caso normal)", async () => {
    const response = await POST(post(toolCall(1)));

    expect(response.status).toBe(200);
    expect(handleRequest).toHaveBeenCalledTimes(1);
  });
});
