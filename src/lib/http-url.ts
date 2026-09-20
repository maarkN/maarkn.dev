import { z } from "zod";

/**
 * URL absoluta com **allowlist de esquema**, para os campos que viram `href`.
 *
 * `z.string().url()` (e o `z.url()` sem `protocol`) aceita `javascript:alert(1)`,
 * `data:text/html,…` e `vbscript:` — comportamento verificado no zod 4 e
 * coberto por `http-url.test.ts`. O React 19 hoje recusa um `href`
 * `javascript:` em tempo de render, mas `data:text/html` passa, e uma defesa
 * que depende de um detalhe do renderer some na primeira troca de renderer.
 *
 * Mesma trava do `urlSchema` do MCP (`src/lib/mcp/tools/_common.ts`) e dos
 * `httpUrlSchema`/`profileUrlSchema` de `_actions/applications.ts` e
 * `_actions/contacts.ts`. Este modulo existe porque um arquivo `"use server"`
 * so pode exportar funcao async: um schema compartilhado tem de morar fora
 * dele para poder ser importado — e testado — direto.
 */

/** Teto de tamanho, igual ao `LIMITS.url` do MCP. */
export const HTTP_URL_MAX = 2000;

/** `true` so para `http://…`/`https://…`. Use antes de renderizar um `href`. */
export function isHttpUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

/**
 * A URL quando ela e http(s), senao `undefined` — a trava do lado do RENDER,
 * para linhas gravadas antes desta validacao existir (ou por fora dela).
 */
export function httpHref(value: string | null | undefined): string | undefined {
  return isHttpUrl(value) ? value!.trim() : undefined;
}

export const httpUrlSchema = z
  .url({ protocol: /^https?$/, error: "Informe uma URL http(s) válida." })
  .max(HTTP_URL_MAX)
  .refine((value) => isHttpUrl(value), {
    message: "A URL deve começar com http:// ou https://.",
  });
