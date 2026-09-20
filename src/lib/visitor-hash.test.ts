import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const IP = "203.0.113.42";
/** Como era antes: sha256 sem sal, truncado — pre-computavel para todo o IPv4. */
const UNSALTED = createHash("sha256").update(IP).digest("hex").slice(0, 32);

const SALT = "sal-de-instalacao-bem-longo";

async function freshModule() {
  vi.resetModules();
  return import("./visitor-hash");
}

const originalSalt = process.env.CHAT_IP_SALT;

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  if (originalSalt === undefined) delete process.env.CHAT_IP_SALT;
  else process.env.CHAT_IP_SALT = originalSalt;
  vi.restoreAllMocks();
});

describe("hashKey", () => {
  it("nao e o sha256 sem sal do IP (que e reversivel por tabela)", async () => {
    process.env.CHAT_IP_SALT = SALT;
    const { hashKey } = await freshModule();

    expect(hashKey(IP)).not.toBe(UNSALTED);
    expect(hashKey(IP)).toBe(createHmac("sha256", SALT).update(IP).digest("hex").slice(0, 32));
    expect(hashKey(IP)).toMatch(/^[0-9a-f]{32}$/);
  });

  it("e estavel com o mesmo sal e separa visitantes diferentes", async () => {
    process.env.CHAT_IP_SALT = SALT;
    const { hashKey } = await freshModule();

    expect(hashKey(IP)).toBe(hashKey(IP));
    expect(hashKey(IP)).not.toBe(hashKey("198.51.100.7"));
  });

  it("troca de sal invalida a tabela do atacante", async () => {
    process.env.CHAT_IP_SALT = SALT;
    const a = (await freshModule()).hashKey(IP);
    process.env.CHAT_IP_SALT = `${SALT}-rotacionado`;
    const b = (await freshModule()).hashKey(IP);

    expect(a).not.toBe(b);
  });

  it("sem a variavel: sal efemero do processo, estavel dentro dele, com aviso", async () => {
    delete process.env.CHAT_IP_SALT;
    const { hashKey } = await freshModule();

    const first = hashKey(IP);
    expect(first).not.toBe(UNSALTED);
    expect(first).toBe(hashKey(IP));
    expect(console.warn).toHaveBeenCalledTimes(1);

    // Outro processo (= outra carga do modulo) nao consegue correlacionar.
    const other = (await freshModule()).hashKey(IP);
    expect(other).not.toBe(first);
  });

  it("recusa sal curto demais em vez de fingir que esta salgado", async () => {
    process.env.CHAT_IP_SALT = "curto";
    const { hashKey } = await freshModule();

    const weak = createHmac("sha256", "curto").update(IP).digest("hex").slice(0, 32);
    expect(hashKey(IP)).not.toBe(weak);
    expect(hashKey(IP)).not.toBe(UNSALTED);
    expect(console.warn).toHaveBeenCalled();
  });
});
