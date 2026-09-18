import "server-only";
import {
  AUTHENTICATED_ONLY,
  defineMcpTool,
  jsonResult,
  type AnyMcpTool,
} from "@/lib/mcp/tool";
import { MCP_SCOPE_LABELS } from "@/lib/mcp/scopes";
import {
  checkSyncState,
  closeSyncRun,
  openSyncRun,
  revertSyncRun,
} from "@/lib/mcp/tools/sync";
import {
  getApplication,
  listApplications,
  logApplicationEvent,
  updateApplicationStage,
  upsertApplication,
} from "@/lib/mcp/tools/applications";
import { searchJobs, upsertJob } from "@/lib/mcp/tools/jobs";
import { upsertExperience, upsertProject } from "@/lib/mcp/tools/content";
import { getProfileFacts } from "@/lib/mcp/tools/profile";
import { generateResume } from "@/lib/mcp/tools/resume";

/**
 * Registro de tools do MCP. **F3b/F4/F5 adicionam aqui.**
 *
 * Como adicionar uma tool:
 *
 *   1. crie `src/lib/mcp/tools/<area>.ts` exportando `defineMcpTool({...})`
 *      (a documentacao do contrato esta em `src/lib/mcp/tool.ts`);
 *   2. importe e some ao array `MCP_TOOLS` abaixo;
 *   3. nao registre nada direto no `McpServer` — o wrapper de
 *      `src/lib/mcp/server.ts` e o que aplica escopo, rate limit e auditoria.
 *
 * Lembretes que valem para toda tool nova:
 *   - nao existe `create_*`, so `upsert_*` com chave natural obrigatoria;
 *   - nenhuma tool aceita `visibility` (o guard do route handler recusa antes);
 *   - toda entrada passa por zod restritivo — o agente e entrada nao confiavel.
 */

const whoami = defineMcpTool({
  name: "whoami",
  title: "Identificar a chave atual",
  description:
    "Devolve o rotulo da chave de API em uso, os escopos concedidos, a data de " +
    "expiracao e quais tools essa chave pode chamar. Use como primeira chamada " +
    "para diagnosticar 'escopo insuficiente' antes de tentar uma sincronizacao " +
    "inteira. Nao expoe a chave em si — apenas o prefixo publico.",
  scopes: AUTHENTICATED_ONLY,
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  async handler(_args, ctx) {
    const allowed = MCP_TOOLS.filter((tool) => {
      if (tool.scopes === AUTHENTICATED_ONLY) return true;
      return tool.scopes.some((scope) => ctx.scopes.includes(scope));
    }).map((tool) => tool.name);

    return jsonResult({
      keyName: ctx.apiKeyName,
      keyPrefix: ctx.keyPrefix,
      scopes: ctx.scopes.map((scope) => ({
        scope,
        descricao: MCP_SCOPE_LABELS[scope],
      })),
      expiraEm: ctx.keyExpiresAt ? ctx.keyExpiresAt.toISOString() : null,
      toolsPermitidas: allowed,
      serverTime: new Date().toISOString(),
      lembrete:
        "Tudo que entra por este servidor nasce private. Promover para publico " +
        "e acao humana na UI do admin — nao existe argumento de visibilidade.",
    });
  },
});

/**
 * Todas as tools expostas pelo servidor.
 *
 * A ordem e a do fluxo real de uma sincronizacao, porque e nesta ordem que o
 * cliente MCP le a lista: abrir rodada -> perguntar o que mudou -> escrever ->
 * fechar (ou reverter). Depois vem leitura e geracao.
 *
 * As 12 tools da tabela do briefing estao todas aqui. `open_sync_run`,
 * `close_sync_run` e `revert_sync_run` sao a infraestrutura que o proprio
 * briefing exige em outro paragrafo — proveniencia por rodada e um caminho de
 * rollback real ("desfazer a ultima sync precisa ser uma operacao real, nao um
 * pg_restore de emergencia") — e sao o unico consumidor do escopo `sync:write`.
 */
export const MCP_TOOLS: AnyMcpTool[] = [
  whoami,
  // sincronizacao
  openSyncRun,
  checkSyncState,
  closeSyncRun,
  revertSyncRun,
  // escrita
  upsertJob,
  upsertApplication,
  updateApplicationStage,
  logApplicationEvent,
  upsertExperience,
  upsertProject,
  // leitura
  listApplications,
  getApplication,
  searchJobs,
  getProfileFacts,
  // geracao
  generateResume,
];

/** Lookup por nome, usado pelo wrapper e pela auditoria. */
export const MCP_TOOLS_BY_NAME: ReadonlyMap<string, AnyMcpTool> = new Map(
  MCP_TOOLS.map((tool) => [tool.name, tool])
);

// Nome duplicado no registro seria um bug silencioso: o SDK sobrescreve a
// primeira tool e o escopo declarado nela deixa de valer.
if (MCP_TOOLS_BY_NAME.size !== MCP_TOOLS.length) {
  throw new Error("[mcp] ha nomes de tool duplicados em MCP_TOOLS");
}
