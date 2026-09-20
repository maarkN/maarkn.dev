import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `login-throttle` e server-only e fala com o Prisma; aqui so interessa a
// derivacao da CHAVE do throttle, que e pura.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {}, dbConfigured: false }));

import { loginClientIp } from "./login-throttle";

function requestWith(headers: Record<string, string>): Request {
  return new Request("https://maarkn.dev/api/auth/callback/credentials", {
    method: "POST",
    headers,
  });
}

describe("loginClientIp", () => {
  it("ignora o valor a esquerda que o cliente escolhe e usa o do proxy", () => {
    const ip = loginClientIp(
      requestWith({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" })
    );
    expect(ip).toBe("198.51.100.7");
  });

  it("da a MESMA chave quando o atacante varia o cabecalho a cada tentativa", () => {
    // O bypass do brute force: um X-Forwarded-For diferente por tentativa. O
    // unico pedaco que o atacante nao escreve e o ultimo, posto pelo Traefik.
    const keys = new Set(
      ["10.0.0.1", "10.0.0.2", "10.0.0.3", "::1", "lixo"].map((forged) =>
        loginClientIp(requestWith({ "x-forwarded-for": `${forged}, 198.51.100.7` }))
      )
    );
    expect([...keys]).toEqual(["198.51.100.7"]);
  });

  it("aceita cadeia de um elemento so (Traefik descarta o header nao confiavel)", () => {
    expect(loginClientIp(requestWith({ "x-forwarded-for": "198.51.100.7" }))).toBe(
      "198.51.100.7"
    );
  });

  it("normaliza porta e colchetes escritos pelo proxy", () => {
    expect(loginClientIp(requestWith({ "x-forwarded-for": "198.51.100.7:5050" }))).toBe(
      "198.51.100.7"
    );
    expect(loginClientIp(requestWith({ "x-forwarded-for": "[2001:db8::1]:5050" }))).toBe(
      "2001:db8::1"
    );
    expect(loginClientIp(requestWith({ "x-forwarded-for": "2001:db8::1" }))).toBe(
      "2001:db8::1"
    );
    expect(
      loginClientIp(requestWith({ "x-forwarded-for": "[::ffff:198.51.100.7]:443" }))
    ).toBe("198.51.100.7");
    expect(loginClientIp(requestWith({ "x-forwarded-for": "fe80::1%eth0" }))).toBe(
      "fe80::1"
    );
  });

  it("nao tranca o DONO: IPv4 mapeado (`::ffff:`) e um balde por origem", () => {
    // Forma que o Traefik e o proprio Node produzem em socket dual-stack. Se
    // ela caisse no balde compartilhado, dez falhas vindas de dez origens
    // diferentes somariam no MESMO contador e trancariam o admin junto — DoS
    // contra o unico usuario do sistema.
    expect(loginClientIp(requestWith({ "x-forwarded-for": "::ffff:198.51.100.7" }))).toBe(
      "198.51.100.7"
    );
    const keys = ["::ffff:203.0.113.1", "::ffff:203.0.113.2", "::ffff:203.0.113.3"].map(
      (hop) => loginClientIp(requestWith({ "x-forwarded-for": hop }))
    );
    expect(keys).toEqual(["203.0.113.1", "203.0.113.2", "203.0.113.3"]);
    expect(keys).not.toContain("desconhecido");
  });

  it("joga token que nao e IP no balde compartilhado, nunca num balde novo", () => {
    const a = loginClientIp(requestWith({ "x-forwarded-for": "nao-e-um-ip" }));
    const b = loginClientIp(requestWith({ "x-forwarded-for": "outro-lixo" }));
    expect(a).toBe("desconhecido");
    expect(b).toBe("desconhecido");
  });

  it("cai no x-real-ip so quando nao ha cadeia de proxy", () => {
    expect(loginClientIp(requestWith({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7"
    );
    // Com cadeia presente, x-real-ip nao resgata um valor invalido: o cliente
    // controla os dois headers quando fala fora do proxy.
    expect(
      loginClientIp(
        requestWith({ "x-forwarded-for": "lixo", "x-real-ip": "203.0.113.9" })
      )
    ).toBe("desconhecido");
    expect(loginClientIp(requestWith({ "x-real-ip": "lixo" }))).toBe("desconhecido");
  });

  it("sem request nao inventa chave", () => {
    expect(loginClientIp(undefined)).toBe("desconhecido");
  });
});

describe("loginClientIp com mais de um proxy confiavel", () => {
  const previous = process.env.LOGIN_TRUSTED_PROXY_HOPS;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.LOGIN_TRUSTED_PROXY_HOPS;
    else process.env.LOGIN_TRUSTED_PROXY_HOPS = previous;
    vi.resetModules();
  });

  it("LOGIN_TRUSTED_PROXY_HOPS=2 le o penultimo elemento", async () => {
    process.env.LOGIN_TRUSTED_PROXY_HOPS = "2";
    const { loginClientIp: withTwoHops } = await import("./login-throttle");
    expect(
      withTwoHops(
        requestWith({ "x-forwarded-for": "203.0.113.9, 198.51.100.7, 192.0.2.1" })
      )
    ).toBe("198.51.100.7");
    // Cadeia curta demais para os saltos declarados = forjada; nada nela vale.
    expect(withTwoHops(requestWith({ "x-forwarded-for": "203.0.113.9" }))).toBe(
      "desconhecido"
    );
  });

  it("nao aceita zero saltos: o header do proxy e a unica fonte aqui", async () => {
    process.env.LOGIN_TRUSTED_PROXY_HOPS = "0";
    const { loginClientIp: withZero } = await import("./login-throttle");
    expect(
      withZero(requestWith({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" }))
    ).toBe("198.51.100.7");
  });
});
