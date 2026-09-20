import { describe, expect, it } from "vitest";
import { clientKey } from "./rate-limit";

/**
 * O /api/chat e publico, anonimo e gasta a OPENAI_API_KEY: o teto por IP e a
 * unica coisa entre um estranho e a fatura. Ate 2026-09-20 `clientKey` lia o
 * PRIMEIRO elemento de `x-forwarded-for`, que e o pedaco que o cliente
 * escreve — um cabecalho novo por requisicao dava um balde novo por
 * requisicao. Estes testes existem para esse bypass nao voltar.
 */
const req = (headers: Record<string, string>) => new Request("https://maarkn.dev/api/chat", { headers });

describe("clientKey", () => {
  it("da a MESMA chave quando o cliente varia o inicio da cadeia a cada requisicao", () => {
    const a = clientKey(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }));
    const b = clientKey(req({ "x-forwarded-for": "2.2.2.2, 203.0.113.7" }));
    const c = clientKey(req({ "x-forwarded-for": "9.9.9.9, 8.8.8.8, 203.0.113.7" }));
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it("usa o IP escrito pelo ultimo salto confiavel, nao o da esquerda", () => {
    expect(clientKey(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("separa visitantes de verdade em baldes diferentes", () => {
    const a = clientKey(req({ "x-forwarded-for": "203.0.113.7" }));
    const b = clientKey(req({ "x-forwarded-for": "198.51.100.4" }));
    expect(a).not.toBe(b);
  });

  it("nao cria balde novo a partir de lixo na cadeia", () => {
    const a = clientKey(req({ "x-forwarded-for": "nao-e-ip" }));
    const b = clientKey(req({ "x-forwarded-for": "tambem-nao" }));
    expect(a).toBe(b);
  });
});
