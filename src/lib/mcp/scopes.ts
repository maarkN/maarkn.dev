/**
 * Escopos do servidor MCP.
 *
 * Um escopo e a unica coisa que impede uma chave de leitura de virar chave de
 * escrita. A checagem acontece **no servidor, por tool** (`src/lib/mcp/tool.ts`
 * + `src/app/api/mcp/route.ts`), nunca por instrucao no prompt do agente.
 *
 * Regras deste arquivo:
 *
 * 1. **Nao ha heranca entre escopos.** `applications:write` NAO concede
 *    `applications:read`. Uma chave que precisa dos dois recebe os dois,
 *    explicitamente. Heranca implicita e como chaves de leitura viram chaves de
 *    escrita sem ninguem perceber.
 * 2. **Nao ha coringa.** Nao existe `*` nem `admin`. A tabela do briefing fala
 *    em `*:read` como abreviacao editorial; aqui isso vira uma lista explicita
 *    (uma tool aceita N escopos, any-of).
 * 3. **Nao existe escopo de visibilidade.** Nenhuma tool aceita `visibility`
 *    como argumento e nenhum escopo promove conteudo para publico — quem
 *    promove e humano, na UI do admin.
 */

/** Todos os escopos que o servidor reconhece. Ordem = ordem de exibicao na UI. */
export const MCP_SCOPES = [
  "sync:read",
  "sync:write",
  "applications:read",
  "applications:write",
  "jobs:read",
  "jobs:write",
  "content:read",
  "content:write",
  "profile:read",
  "resume:generate",
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

/** Rotulos pt-BR para a UI de `/admin/api-keys`. */
export const MCP_SCOPE_LABELS: Record<McpScope, string> = {
  "sync:read": "Consultar estado de sincronizacao (quais arquivos mudaram)",
  "sync:write": "Abrir/fechar rodadas de sincronizacao e gravar sync state",
  "applications:read": "Ler candidaturas, eventos e checklists",
  "applications:write": "Criar/atualizar candidaturas (upsert por folderName)",
  "jobs:read": "Ler vagas e o radar",
  "jobs:write": "Criar/atualizar vagas (upsert por sourceUrl)",
  "content:read": "Ler experiencias, projetos de carreira, skills e posts",
  "content:write": "Criar/atualizar experiencias e projetos (upsert por slug)",
  "profile:read": "Ler fatos de perfil (pretensao, referencias, regras R1-R8)",
  "resume:generate": "Gerar CV/carta a partir de um job spec",
};

/**
 * Escopos considerados de ESCRITA. Usado para (a) destacar na UI e (b) decidir
 * o quanto o servidor exige antes de deixar a chamada passar (auditoria
 * obrigatoria, rate limit mais apertado).
 */
export const MCP_WRITE_SCOPES: readonly McpScope[] = [
  "sync:write",
  "applications:write",
  "jobs:write",
  "content:write",
  "resume:generate",
];

const SCOPE_SET: ReadonlySet<string> = new Set<string>(MCP_SCOPES);

/** Type guard: a string veio do banco/JSON e pode ser qualquer coisa. */
export function isMcpScope(value: unknown): value is McpScope {
  return typeof value === "string" && SCOPE_SET.has(value);
}

/**
 * Filtra a lista crua vinda de `ApiKey.scopes` (String[] no Postgres, portanto
 * entrada nao confiavel) para escopos conhecidos. Um escopo desconhecido —
 * seja typo de quem criou a chave, seja lixo injetado — e simplesmente
 * descartado, nunca concedido.
 */
export function parseScopes(raw: readonly unknown[] | null | undefined): McpScope[] {
  if (!raw) return [];
  const out: McpScope[] = [];
  for (const item of raw) {
    if (isMcpScope(item) && !out.includes(item)) out.push(item);
  }
  return out;
}

export function isWriteScope(scope: McpScope): boolean {
  return MCP_WRITE_SCOPES.includes(scope);
}

/**
 * `granted` cobre `required`? Semantica **any-of**: a tool declara os escopos
 * que aceita e basta um deles. Comparacao por igualdade exata, sem prefixo,
 * sem coringa.
 */
export function hasAnyScope(
  granted: readonly McpScope[],
  required: readonly McpScope[]
): boolean {
  if (required.length === 0) return false; // lista vazia nunca autoriza nada
  return required.some((scope) => granted.includes(scope));
}
