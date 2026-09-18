import type { z } from "zod";
import { isWriteScope, type McpScope } from "@/lib/mcp/scopes";
import type { AuditReason } from "@/lib/mcp/audit";

/**
 * Contrato de uma tool do MCP. **Este e o arquivo que F3b usa.**
 *
 * Uma tool nunca e registrada direto no `McpServer`: ela e declarada com
 * `defineMcpTool` e entra no registro (`src/lib/mcp/tools/index.ts`). Quem
 * registra de fato e `buildMcpServer` (`src/lib/mcp/server.ts`), que embrulha
 * cada handler com escopo -> rate limit -> auditoria -> execucao. Um handler
 * jamais deve repetir essas checagens, e jamais consegue pula-las.
 *
 * Regras que o wrapper garante e que voce nao precisa (nem deve) reimplementar:
 *
 *   - **Escopo por tool, no servidor.** Declarado em `scopes` (semantica
 *     any-of). Sem escopo aceito, o handler nao roda.
 *   - **Nenhuma tool aceita `visibility`.** O route handler recusa a
 *     requisicao inteira se a palavra aparecer como CHAVE em qualquer nivel do
 *     payload JSON-RPC. Nao adicione o campo ao seu `inputSchema` "so para
 *     ignorar depois": a recusa acontece antes de chegar em voce. Tudo que
 *     entra por MCP nasce `private`; promover e acao humana na UI.
 *   - **Validacao zod.** O `inputSchema` e aplicado pelo SDK antes do handler.
 *     Escreva-o restritivo (min/max, enum, url, datetime): o agente do outro
 *     lado e entrada NAO confiavel.
 *   - **Chave natural obrigatoria.** Nao existe `create_*`. Toda tool de
 *     escrita e `upsert_*` e recebe a chave natural como campo obrigatorio
 *     (`folderName`, `sourceUrl`, `slug`, ...). Sem chave, recuse com
 *     `McpToolError` — nunca invente um id.
 *   - **Auditoria.** Argumentos e resultado sao resumidos e redigidos
 *     automaticamente. Nao logue nada por conta propria com dado do payload.
 */

/** Tools que so exigem uma chave valida, sem escopo especifico (ex.: `whoami`). */
export const AUTHENTICATED_ONLY = "authenticated-only" as const;

/**
 * Escopos aceitos pela tool, em semantica **any-of**. O tipo e uma tupla
 * nao-vazia de proposito: um array vazio nao compila, entao nao existe o
 * acidente "tool de escrita que esqueceu de declarar escopo e virou publica".
 */
export type McpToolScopes =
  | readonly [McpScope, ...McpScope[]]
  | typeof AUTHENTICATED_ONLY;

/** O que o handler recebe alem dos argumentos. Nada aqui e segredo. */
export type McpToolContext = {
  apiKeyId: string;
  /** Rotulo humano da chave, para proveniencia. */
  apiKeyName: string;
  /** Prefixo publico (`mk_live_ab12cd34`). Seguro para gravar/mostrar. */
  keyPrefix: string;
  scopes: readonly McpScope[];
  /** Expiracao da chave, se houver. */
  keyExpiresAt: Date | null;
  /** IP do cliente, ja normalizado. Pode ser "desconhecido". */
  ip: string;
  /**
   * Id da linha de `McpAuditLog` desta chamada. `recordProvenance` grava
   * este id em `Provenance.auditId` automaticamente — nao precisa (nem deve)
   * ser repassado a mao pelas tools.
   */
  auditId: string | null;
  /** Nome da tool sendo executada. */
  tool: string;
  /** Aborta se o cliente desistir da requisicao. */
  signal?: AbortSignal;
};

export type McpTextContent = { type: "text"; text: string };

export type McpToolResult = {
  content: McpTextContent[];
  /** Espelho estruturado do texto, quando a tool declara `outputSchema`. */
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

/**
 * Erro de negocio de uma tool: vira resultado `isError` para o agente e linha
 * `denied`/`error` na auditoria, com a `reason` preservada.
 *
 * A `message` vai para o agente — escreva-a em pt-BR, acionavel, e **sem
 * detalhe interno** (sem SQL, sem stack, sem id de outra entidade).
 */
export class McpToolError extends Error {
  readonly reason: AuditReason;

  constructor(message: string, reason: AuditReason = "tool_error") {
    super(message);
    this.name = "McpToolError";
    this.reason = reason;
  }
}

export type McpToolDefinition<Shape extends z.ZodRawShape = z.ZodRawShape> = {
  /** snake_case, como na tabela do briefing (`upsert_application`). */
  name: string;
  /** Titulo curto para clientes que exibem uma lista. */
  title: string;
  /**
   * O que a tool faz, em que ordem, e o que ela NAO faz. O agente le isto —
   * e a unica documentacao que ele tem. Cite a chave natural exigida.
   */
  description: string;
  scopes: McpToolScopes;
  inputSchema: Shape;
  outputSchema?: z.ZodRawShape;
  /**
   * Dicas do protocolo. `readOnlyHint: true` e o que classifica a tool como
   * leitura para efeito de rate limit quando ela nao tem escopo de escrita.
   */
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  handler: (
    args: z.infer<z.ZodObject<Shape>>,
    ctx: McpToolContext
  ) => Promise<McpToolResult>;
};

/** Forma apagada, para o registro heterogeneo. */
export type AnyMcpTool = McpToolDefinition<z.ZodRawShape>;

/**
 * Declara uma tool. Preserva a inferencia de tipo dos argumentos dentro do
 * `handler` e devolve a forma apagada que o registro consome.
 */
export function defineMcpTool<Shape extends z.ZodRawShape>(
  def: McpToolDefinition<Shape>
): AnyMcpTool {
  return def as unknown as AnyMcpTool;
}

/**
 * A tool escreve? Usado para o rate limit mais apertado e para a auditoria.
 * Decidido pelos ESCOPOS declarados, nao por um booleano solto — assim nao da
 * para uma tool de escrita se declarar leitura e ganhar o teto folgado.
 */
export function isWriteTool(def: AnyMcpTool): boolean {
  if (def.scopes === AUTHENTICATED_ONLY) return false;
  return def.scopes.some(isWriteScope);
}

/** Escopos aceitos como array (vazio = apenas autenticacao). */
export function acceptedScopes(def: AnyMcpTool): readonly McpScope[] {
  return def.scopes === AUTHENTICATED_ONLY ? [] : def.scopes;
}

// --------------------------- helpers de resultado --------------------------

export function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

/**
 * Resultado com corpo estruturado. O texto continua sendo o JSON — clientes
 * que ignoram `structuredContent` precisam ver a mesma informacao.
 */
export function jsonResult(value: Record<string, unknown>): McpToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

export function errorResult(message: string): McpToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
