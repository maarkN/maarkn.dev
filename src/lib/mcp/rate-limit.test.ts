import { describe, expect, it, vi } from "vitest";

// `rate-limit` e server-only e fala com o Prisma; aqui so interessa a
// derivacao da CHAVE do balde de IP, que e pura.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {}, dbConfigured: false }));

import { clientIp, hashIp } from "./rate-limit";

function requestWith(headers: Record<string, string>): Request {
  return new Request("https://maarkn.dev/api/mcp", { method: "POST", headers });
}

/**
 * O que este arquivo tranca: o balde de IP (60/min) e a PRIMEIRA checagem do
 * `POST /api/mcp`, antes da autenticacao e antes de qualquer escrita em
 * `McpAuditLog` — e o que impede um flood anonimo de virar um INSERT por
 * pacote no mesmo Postgres que guarda o funil de carreira inteiro. Se a chave
 * do balde sair do primeiro elemento de `x-forwarded-for` (valor que o CLIENTE
 * escreve), cada requisicao cai num balde novo e esse teto nao existe.
 */
describe("clientIp — chave do balde pre-autenticacao", () => {
  it("le o ultimo salto confiavel, nunca o valor a esquerda do cliente", () => {
    expect(
      clientIp(requestWith({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" }))
    ).toBe("198.51.100.7");
  });

  it("um cabecalho novo por requisicao NAO da um balde novo por requisicao", () => {
    const buckets = new Set(
      [
        "10.0.0.1",
        "10.0.0.2",
        "10.0.0.3",
        "::1",
        "lixo",
        "198.51.100.7, 203.0.113.50",
      ].map((forged) =>
        hashIp(clientIp(requestWith({ "x-forwarded-for": `${forged}, 198.51.100.7` })))
      )
    );
    expect(buckets.size).toBe(1);
    expect([...buckets]).toEqual([hashIp("198.51.100.7")]);
  });

  it("normaliza as formas que o proxy escreve (mesmo cliente, um balde)", () => {
    const buckets = new Set(
      [
        "198.51.100.7",
        "198.51.100.7:5050",
        "::ffff:198.51.100.7",
        "[::ffff:198.51.100.7]:443",
      ].map((hop) => clientIp(requestWith({ "x-forwarded-for": hop })))
    );
    expect([...buckets]).toEqual(["198.51.100.7"]);
  });

  it("cadeia inutilizavel cai no balde compartilhado", () => {
    expect(clientIp(requestWith({ "x-forwarded-for": "nao-e-um-ip" }))).toBe(
      "desconhecido"
    );
    expect(clientIp(requestWith({}))).toBe("desconhecido");
  });

  it("cai no x-real-ip so quando nao ha cadeia de proxy", () => {
    expect(clientIp(requestWith({ "x-real-ip": "::ffff:198.51.100.7" }))).toBe(
      "198.51.100.7"
    );
    expect(
      clientIp(requestWith({ "x-forwarded-for": "lixo", "x-real-ip": "203.0.113.9" }))
    ).toBe("desconhecido");
  });
});
