import { afterEach, describe, expect, it } from "vitest";

import { UNKNOWN_IP, normalizeIp, trustedClientIp } from "./trusted-client-ip";

function requestWith(headers: Record<string, string>): Request {
  return new Request("https://maarkn.dev/", { method: "POST", headers });
}

/**
 * A REGRESSAO que este arquivo tranca: `::ffff:1.2.3.4` (IPv4 mapeado em IPv6)
 * e o que proxies e o proprio Node produzem em socket dual-stack. Rejeitar
 * essa forma jogava TODO login nesse formato no balde compartilhado, e 10
 * falhas vindas de QUALQUER origem trancavam o dono junto — negacao de servico
 * contra o unico usuario do sistema, criada pela correcao anterior.
 */
describe("normalizeIp — formas que proxies produzem de verdade", () => {
  const cases: Array<[string, string]> = [
    ["1.2.3.4", "1.2.3.4"],
    ["1.2.3.4:5050", "1.2.3.4"],
    ["2001:db8::1", "2001:db8::1"],
    ["[2001:db8::1]:5050", "2001:db8::1"],
    ["::1", "::1"],
    ["[::1]:5050", "::1"],
    // IPv4 mapeado, todas as grafias.
    ["::ffff:1.2.3.4", "1.2.3.4"],
    ["::FFFF:1.2.3.4", "1.2.3.4"],
    ["0:0:0:0:0:ffff:1.2.3.4", "1.2.3.4"],
    ["0000:0000:0000:0000:0000:ffff:198.51.100.7", "198.51.100.7"],
    ["[::ffff:198.51.100.7]:443", "198.51.100.7"],
    ["::ffff:198.51.100.7:443", "198.51.100.7"],
    // Zona de escopo.
    ["fe80::1%eth0", "fe80::1"],
    ["fe80::1%25eth0", "fe80::1"],
    ["[fe80::1%eth0]:5050", "fe80::1"],
    // Espaco em volta e caixa alta.
    ["  198.51.100.7  ", "198.51.100.7"],
    ["2001:DB8::1", "2001:db8::1"],
  ];

  for (const [raw, expected] of cases) {
    it(`${raw} -> ${expected}`, () => {
      expect(normalizeIp(raw)).toBe(expected);
    });
  }

  it("o mesmo cliente da UM balde, escreva o proxy a forma que escrever", () => {
    const grafias = [
      "198.51.100.7",
      "198.51.100.7:5050",
      "::ffff:198.51.100.7",
      "[::ffff:198.51.100.7]:443",
      "0:0:0:0:0:ffff:198.51.100.7",
    ];
    expect(new Set(grafias.map(normalizeIp))).toEqual(new Set(["198.51.100.7"]));
  });

  it("le `2001:db8::1:80` como endereco, nao como endereco + porta", () => {
    expect(normalizeIp("2001:db8::1:80")).toBe("2001:db8::1:80");
  });

  it("recusa o que nao e IP — lixo nunca vira balde proprio", () => {
    for (const raw of [
      "",
      "   ",
      null,
      undefined,
      "nao-e-um-ip",
      "1.2.3.4.5",
      "999.1.1.1",
      "[]",
      "[2001:db8::1",
      "<script>",
      "1.2.3.4 1.2.3.5",
    ]) {
      expect(normalizeIp(raw)).toBeNull();
    }
  });
});

describe("trustedClientIp — ultimo salto confiavel", () => {
  it("ignora o valor a esquerda que o cliente escolhe", () => {
    expect(
      trustedClientIp(requestWith({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" }))
    ).toBe("198.51.100.7");
  });

  it("da a MESMA chave quando o atacante varia o cabecalho a cada requisicao", () => {
    const keys = new Set(
      ["10.0.0.1", "10.0.0.2", "::1", "lixo", "::ffff:9.9.9.9"].map((forged) =>
        trustedClientIp(requestWith({ "x-forwarded-for": `${forged}, 198.51.100.7` }))
      )
    );
    expect([...keys]).toEqual(["198.51.100.7"]);
  });

  it("NAO tranca o dono: cada origem mapeada mantem o proprio balde", () => {
    // O proxy escreve o IPv4 mapeado. Se essa forma virasse `desconhecido`,
    // dez falhas de dez origens diferentes somariam no MESMO contador e
    // trancariam o admin junto.
    const keys = [
      "::ffff:203.0.113.1",
      "::ffff:203.0.113.2",
      "::ffff:203.0.113.3",
    ].map((hop) => trustedClientIp(requestWith({ "x-forwarded-for": hop })));
    expect(keys).toEqual(["203.0.113.1", "203.0.113.2", "203.0.113.3"]);
    expect(keys).not.toContain(UNKNOWN_IP);
  });

  it("cadeia inutilizavel cai no balde compartilhado, nunca num balde novo", () => {
    const a = trustedClientIp(requestWith({ "x-forwarded-for": "nao-e-um-ip" }));
    const b = trustedClientIp(requestWith({ "x-forwarded-for": "outro-lixo" }));
    expect([a, b]).toEqual([UNKNOWN_IP, UNKNOWN_IP]);
  });

  it("cai no x-real-ip so quando nao ha cadeia de proxy", () => {
    expect(trustedClientIp(requestWith({ "x-real-ip": "::ffff:198.51.100.7" }))).toBe(
      "198.51.100.7"
    );
    // Com cadeia presente, x-real-ip nao resgata um valor invalido: fora do
    // proxy o cliente controla os dois headers.
    expect(
      trustedClientIp(
        requestWith({ "x-forwarded-for": "lixo", "x-real-ip": "203.0.113.9" })
      )
    ).toBe(UNKNOWN_IP);
  });

  it("sem request nao inventa chave", () => {
    expect(trustedClientIp(undefined)).toBe(UNKNOWN_IP);
  });

  describe("saltos confiaveis", () => {
    afterEach(() => {
      delete process.env.TRUSTED_PROXY_HOPS;
    });

    it("com 2 saltos le o penultimo elemento", () => {
      expect(
        trustedClientIp(
          requestWith({ "x-forwarded-for": "203.0.113.9, 198.51.100.7, 192.0.2.1" }),
          2
        )
      ).toBe("198.51.100.7");
    });

    it("cadeia curta demais para os saltos declarados = forjada", () => {
      expect(trustedClientIp(requestWith({ "x-forwarded-for": "203.0.113.9" }), 2)).toBe(
        UNKNOWN_IP
      );
    });

    it("TRUSTED_PROXY_HOPS vale quando nenhum salto e passado", () => {
      process.env.TRUSTED_PROXY_HOPS = "2";
      expect(
        trustedClientIp(
          requestWith({ "x-forwarded-for": "203.0.113.9, 198.51.100.7, 192.0.2.1" })
        )
      ).toBe("198.51.100.7");
    });

    it("nao aceita zero saltos: o header do proxy e a unica fonte", () => {
      expect(
        trustedClientIp(requestWith({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" }), 0)
      ).toBe("198.51.100.7");
    });
  });
});
