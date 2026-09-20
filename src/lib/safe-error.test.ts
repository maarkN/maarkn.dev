import { describe, expect, it } from "vitest";
import { safeDbError } from "./safe-error";

/** Erro do Prisma, na forma que chega ao `catch` de uma Server Action. */
function prismaError(over: Record<string, unknown>) {
  const err = new Error(String(over.message ?? "boom"));
  return Object.assign(err, over);
}

describe("safeDbError", () => {
  it("guarda codigo e modelo — o que serve para depurar", () => {
    const err = prismaError({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      meta: { modelName: "Application", target: ["folderName"] },
    });
    expect(safeDbError(err)).toBe("PrismaClientKnownRequestError(P2002) model=Application");
  });

  it("nao deixa vazar a PII que o Prisma embute na mensagem", () => {
    // Forma real de um PrismaClientValidationError: o `data` da chamada inteiro
    // dentro da `message` — salario, nota do recrutador, CV gerado.
    const err = prismaError({
      name: "PrismaClientValidationError",
      message:
        "Invalid `db.application.create()` invocation:\n" +
        "{ targetSalary: 'EUR 95k', notesMd: 'recrutadora Jane +1 555 0142 disse que…', " +
        "resume: '# Marco …' }",
    });
    const out = safeDbError(err);
    expect(out).toBe("PrismaClientValidationError");
    expect(out).not.toContain("95k");
    expect(out).not.toContain("Jane");
    expect(out).not.toContain("555");
    expect(out).not.toContain("targetSalary");
  });

  it("nao repassa stack nem meta livre", () => {
    const err = prismaError({
      name: "PrismaClientKnownRequestError",
      code: "P2025",
      meta: { modelName: "Generation", cause: "Record to update not found: id cku_secreto" },
    });
    expect(safeDbError(err)).toBe("PrismaClientKnownRequestError(P2025) model=Generation");
  });

  it("sanitiza codigo/modelo hostis em vez de escrever no log o que veio", () => {
    const err = prismaError({
      name: "Weird\nError",
      code: "P2002\n[admin] linha forjada no log",
      meta: { modelName: "A".repeat(200) },
    });
    const out = safeDbError(err);
    expect(out).not.toContain("\n");
    expect(out).toBe(`WeirdError(P2002adminlinhaforjadanolog) model=${"A".repeat(40)}`);
  });

  it("aceita erro sem forma de erro", () => {
    expect(safeDbError("string solta")).toBe("erro desconhecido");
    expect(safeDbError(undefined)).toBe("erro desconhecido");
    expect(safeDbError(new Error("falhou"))).toBe("Error");
  });
});
