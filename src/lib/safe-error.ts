/**
 * Resumo de erro seguro para `console.*` do servidor.
 *
 * Por que existe: `console.error("…", err)` com um erro do Prisma imprime o
 * objeto inteiro no log do container. Num erro de validacao o Prisma embute o
 * `data` da chamada na propria `message` — ou seja, o log recebe salario alvo,
 * nota de recrutador e o CV/carta recem-gerados, dados pessoais que nao tem
 * nada que fazer num log de infraestrutura (e que ficam retidos por quem
 * coleta o stdout do container).
 *
 * O que fica: o suficiente para depurar — nome da classe do erro, codigo
 * estavel (`P2002`, `P2025`, …) e o modelo envolvido, quando o Prisma informa.
 * O que sai: `message`, `stack`, `meta` livre e qualquer valor de campo.
 *
 * Duck typing de proposito: nao importa `@prisma/client` (este modulo e puro e
 * testavel) e continua valendo para erro que so *parece* com o do Prisma.
 */

/** Um pedaco de identificador vindo do erro nunca vira texto livre no log. */
function tag(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const cleaned = String(value).replace(/[^\w.:-]/g, "");
  return cleaned ? cleaned.slice(0, 40) : null;
}

/**
 * `Error(P2002) model=Application` — nunca a mensagem, nunca o payload.
 */
export function safeDbError(err: unknown): string {
  if (!err || typeof err !== "object") return "erro desconhecido";

  const name = tag((err as { name?: unknown }).name) ?? "Error";
  const code = tag((err as { code?: unknown }).code);

  const meta = (err as { meta?: unknown }).meta;
  const model =
    meta && typeof meta === "object"
      ? tag((meta as { modelName?: unknown }).modelName)
      : null;

  return [code ? `${name}(${code})` : name, model ? `model=${model}` : null]
    .filter(Boolean)
    .join(" ");
}
