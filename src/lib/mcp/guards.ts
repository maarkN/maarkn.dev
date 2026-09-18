import "server-only";

/**
 * Guardas estruturais aplicados ao payload CRU, antes de qualquer tool.
 *
 * Existem porque as regras que eles defendem nao podem depender de disciplina
 * de codigo: F3b, F4 e F5 vao adicionar dezenas de tools, escritas por agentes,
 * e uma delas so precisa esquecer uma linha para abrir o buraco. Um choke point
 * unico no route handler e verificavel; N handlers educados nao sao.
 */

/**
 * Nomes de campo proibidos em QUALQUER nivel do payload.
 *
 * Regra 1 de F3: nenhuma tool aceita `visibility` como argumento. Tudo que
 * entra pelo MCP nasce `private`; promover para publico e acao explicita de
 * humano na UI do admin. Se o agente pudesse decidir visibilidade, uma unica
 * alucinacao publicaria telefone de recrutador no chat do site.
 *
 * A comparacao e por **nome exato de chave**, minusculado. Campos legitimos que
 * apenas contem a palavra (`publicName`, `publicUrl`, `visibilityNote`)
 * continuam passando — `Company.publicName` e um campo real e obrigatorio para
 * o modelo de confidencialidade.
 */
const FORBIDDEN_KEYS = new Set([
  "visibility",
  "visibilidade",
  "ispublic",
  "is_public",
  "public",
  "publico",
  "makepublic",
  "make_public",
]);

/** Teto de profundidade: payload absurdo e recusado, nao percorrido. */
const MAX_DEPTH = 24;

export type ForbiddenArgFinding = {
  /** Caminho ate a chave, para a mensagem de erro. */
  path: string;
  key: string;
};

/**
 * Varre o payload JSON-RPC inteiro atras de chaves proibidas.
 *
 * Roda sobre o corpo CRU (antes do zod), porque o zod de cada tool usa
 * `strip`: um campo desconhecido seria silenciosamente descartado e o agente
 * acharia que a visibilidade foi aceita. Recusar alto e ruidoso e melhor —
 * ensina o agente a nao mandar de novo.
 */
export function findForbiddenArgument(
  value: unknown,
  path = "$",
  depth = 0
): ForbiddenArgFinding | null {
  if (depth > MAX_DEPTH) return { path, key: "<profundidade>" };
  if (value === null || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = findForbiddenArgument(value[i], `${path}[${i}]`, depth + 1);
      if (found) return found;
    }
    return null;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      return { path: `${path}.${key}`, key };
    }
    const found = findForbiddenArgument(child, `${path}.${key}`, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Extrai, do corpo JSON-RPC, os metodos e nomes de tool sendo chamados —
 * apenas para a auditoria e para a mensagem de erro. Nao valida nada: o
 * transporte do SDK e quem faz o parse de verdade.
 */
export function describeJsonRpcCall(body: unknown): {
  method: string;
  toolNames: string[];
} {
  const messages = Array.isArray(body) ? body : [body];
  const methods: string[] = [];
  const toolNames: string[] = [];

  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const record = message as Record<string, unknown>;
    if (typeof record.method === "string") methods.push(record.method.slice(0, 60));
    const params = record.params;
    if (params && typeof params === "object") {
      const name = (params as Record<string, unknown>).name;
      if (typeof name === "string") toolNames.push(name.slice(0, 60));
    }
  }

  return {
    method: methods.length > 0 ? methods.join(",").slice(0, 120) : "<sem metodo>",
    toolNames,
  };
}

/**
 * Origem permitida (protecao contra DNS rebinding e CSRF de navegador).
 *
 * Server Actions do Next tem checagem de origem embutida; **route handlers nao
 * tem**. Um cliente MCP legitimo (Claude Code, ChatGPT) nao manda `Origin`;
 * um navegador sempre manda. Portanto: sem `Origin` -> segue (cliente nativo);
 * com `Origin` -> so passa se estiver na allowlist de `MCP_ALLOWED_ORIGINS`
 * (vazia por padrao, ou seja, nenhum navegador entra).
 *
 * Isso, somado a exigencia do header `Authorization` (que forca preflight CORS
 * e que o navegador nao anexa sozinho), fecha o vetor de CSRF do endpoint.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  const allowed = (process.env.MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}
