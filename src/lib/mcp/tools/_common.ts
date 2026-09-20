import "server-only";
import { z } from "zod";
import {
  BulletLayer,
  CoverageLevel,
  DocKind,
  EventDirection,
  FunnelStage,
  Prisma,
  SourceGeneration,
  SponsorshipSignal,
} from "@prisma/client";
import { db, dbConfigured } from "@/lib/db";
import { McpToolError, type McpToolContext } from "@/lib/mcp/tool";

/**
 * Pecas compartilhadas pelas tools do MCP (F3b).
 *
 * Tres coisas moram aqui, e nenhuma delas e opcional numa tool de escrita:
 *
 * 1. **Normalizacao de chave natural.** O vault vive num macOS, que grava nomes
 *    de arquivo em Unicode NFD (`c` + combinacao de cedilha), enquanto quase
 *    todo o resto do mundo — inclusive um agente que digitou o nome — usa NFC.
 *    As duas formas sao bytes diferentes, entao `"Verificação"` (NFD) e
 *    `"Verificação"` (NFC) passariam pelo `@unique` do Postgres como DUAS
 *    linhas. Isso derruba a promessa central do F3 ("sincronizar duas vezes nao
 *    cria uma linha a mais"). Toda chave natural passa por `normalizeKey`.
 *
 * 2. **Proveniencia por fato + rodada de sincronizacao.** `recordProvenance`
 *    guarda o `before`/`after` apenas dos campos que MUDARAM, o que torna
 *    "desfazer a ultima sync" uma operacao real (reaplica `before`) e mantem a
 *    tabela pequena numa rodada idempotente (nada mudou => nenhuma linha).
 *
 * 3. **Diff antes de escrever.** `pickChanged` e o que faz a segunda rodada ser
 *    barata: sem mudanca de fato, nao ha `Provenance`, nao ha reembedding e o
 *    resultado devolve `criado: false, alterado: false`.
 *
 * O que este arquivo deliberadamente NAO faz: checagem de escopo, rate limit,
 * auditoria e recusa de `visibility` — tudo isso e do wrapper
 * (`src/lib/mcp/server.ts`) e do route handler. Nenhuma tool reimplementa.
 */

// --------------------------------------------------------------------------
// limites de tamanho — o agente do outro lado e entrada NAO confiavel
// --------------------------------------------------------------------------

export const LIMITS = {
  /** Chave natural (folderName, slug, key). */
  key: 300,
  /** Texto de uma linha (titulo, cargo, cidade). */
  short: 300,
  /** Texto medio (resumo, motivo, nota curta). */
  text: 4_000,
  /** Corpo markdown (dossie, descricao de vaga, carta). */
  markdown: 200_000,
  /** Caminho relativo dentro do vault. */
  path: 500,
  url: 2_000,
  /** Itens por colecao aninhada num unico upsert. */
  children: 200,
  /** Arquivos por chamada de `check_sync_state`. */
  batch: 500,
} as const;

// --------------------------------------------------------------------------
// pecas zod reaproveitaveis
// --------------------------------------------------------------------------

export const sha256Schema = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, "sha256 deve ter exatamente 64 caracteres hexadecimais");

export const pathSchema = z.string().min(1).max(LIMITS.path);
export const keySchema = z.string().min(1).max(LIMITS.key);
export const shortSchema = z.string().max(LIMITS.short);
export const textSchema = z.string().max(LIMITS.text);
export const markdownSchema = z.string().max(LIMITS.markdown);
/**
 * URL absoluta com **allowlist de esquema**.
 *
 * `z.url()` sozinho aceita `javascript:alert(1)`, `data:text/html,...` e
 * `vbscript:` — verificado no zod 4.4. Todo campo de URL daqui (`careersUrl`,
 * `linkedinUrl`, `repoUrl`, `demoUrl`, `website`, `sourceUrl`) e escrito por um
 * agente (entrada NAO confiavel) e vai ser renderizado como `href` no admin.
 * Sem esta trava, um `upsert_job` com `company.careersUrl = "javascript:…"`
 * vira XSS armazenado na origem do backoffice no dia em que a tela de detalhe
 * de F2 renderizar o link.
 */
export const urlSchema = z
  .url({ protocol: /^https?$/ })
  .max(LIMITS.url)
  .refine((value) => /^https?:\/\//i.test(value.trim()), {
    message: "A URL deve comecar com http:// ou https://.",
  });

/** Data ISO-8601: aceita `2026-08-16` e `2026-08-16T09:30:00Z`. */
export const dateSchema = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

export const funnelStageSchema = z.enum(FunnelStage);
export const sponsorshipSchema = z.enum(SponsorshipSignal);
export const docKindSchema = z.enum(DocKind);
export const coverageLevelSchema = z.enum(CoverageLevel);
export const eventDirectionSchema = z.enum(EventDirection);
export const bulletLayerSchema = z.enum(BulletLayer);

/**
 * Geracao do frontmatter. O vault escreve `jul-2026` / `ago-2026`; o enum do
 * Postgres guarda o mesmo rotulo (`@map`), mas o Prisma Client expoe
 * `jul_2026`. Aceitamos as duas grafias para nao transformar um detalhe de
 * mapeamento em erro de sincronizacao, e normalizamos com `toSourceGeneration`.
 */
export const sourceGenerationSchema = z.enum([
  "jul-2026",
  "ago-2026",
  "jul_2026",
  "ago_2026",
]);

/** Id de `SyncRun`, quando a chamada faz parte de uma rodada aberta. */
export const syncRunIdSchema = z.string().min(1).max(60);

/**
 * Bloco de origem: de qual arquivo do vault este fato veio. Opcional porque um
 * agente pode corrigir um campo sem ter um arquivo por tras — mas quando vier,
 * alimenta `Provenance`, o carimbo desnormalizado da entidade e o `SyncState`.
 */
export const sourceFileSchema = z.object({
  path: pathSchema.describe("Caminho relativo dentro do vault (ex.: '04 - Candidaturas/epilot/CV.md')."),
  sha256: sha256Schema.optional().describe(
    "sha256 do conteudo do arquivo. Quando enviado, atualiza o SyncState — e a proxima chamada de check_sync_state devolve 'inalterado'."
  ),
  sizeBytes: z.number().int().min(0).max(1_000_000_000).optional(),
  generation: sourceGenerationSchema.optional(),
});

export type SourceFileInput = z.infer<typeof sourceFileSchema>;

// --------------------------------------------------------------------------
// normalizacao
// --------------------------------------------------------------------------

/**
 * Chave natural canonica: Unicode NFC + `trim`. Ver o item 1 do cabecalho —
 * sem isto, macOS (NFD) e agente (NFC) criam duas linhas para a mesma pasta.
 */
export function normalizeKey(raw: string, label: string): string {
  const value = raw.normalize("NFC").trim();
  if (!value) {
    throw new McpToolError(
      `${label} e obrigatorio e nao pode ser vazio. Sem chave natural nao existe upsert — esta tool nunca inventa um registro novo.`,
      "invalid_arguments"
    );
  }
  return value;
}

/** Caminho do vault: mesma normalizacao da chave, com barras uniformizadas. */
export function normalizePath(raw: string, label = "sourcePath"): string {
  return normalizeKey(raw.replace(/\\/g, "/"), label);
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

/**
 * Slug canonico: minusculo, ASCII-ish, sem espaco. Recusar (em vez de
 * "consertar" silenciosamente) e proposital: `Fullscript (IAM)` e
 * `Fullscript IAM` viram slugs diferentes se cada rodada inventar o seu, e o
 * agente e nao deterministico. Errar alto ensina; consertar escondido duplica.
 */
export function normalizeSlug(raw: string, label = "slug"): string {
  const value = raw.normalize("NFC").trim().toLowerCase();
  if (!SLUG_RE.test(value)) {
    throw new McpToolError(
      `${label} invalido ('${value.slice(0, 60)}'). Use minusculas, digitos, '-', '_' ou '.', comecando e terminando com letra ou digito (ex.: 'sevencred', 'fintech-loan-api').`,
      "invalid_arguments"
    );
  }
  return value;
}

/** URL canonica para dedupe: sem fragmento e sem barra final redundante. */
export function normalizeUrl(raw: string, label = "sourceUrl"): string {
  const trimmed = normalizeKey(raw, label);
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new McpToolError(`${label} nao e uma URL absoluta valida.`, "invalid_arguments");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new McpToolError(`${label} deve usar http ou https.`, "invalid_arguments");
  }
  parsed.hash = "";
  const normalized = parsed.toString();
  return normalized.endsWith("/") && parsed.pathname !== "/"
    ? normalized.slice(0, -1)
    : normalized;
}

export function toSourceGeneration(
  value: z.infer<typeof sourceGenerationSchema> | undefined
): SourceGeneration | undefined {
  if (!value) return undefined;
  return value.replace("-", "_") === "jul_2026"
    ? SourceGeneration.jul_2026
    : SourceGeneration.ago_2026;
}

/** Converte data ISO (com ou sem hora) em `Date`, recusando lixo. */
export function toDate(value: string | undefined, label: string): Date | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) {
    throw new McpToolError(`${label} nao e uma data ISO-8601 valida.`, "invalid_arguments");
  }
  return date;
}

/** Remove as chaves `undefined` — campo omitido NUNCA apaga valor existente. */
export function omitUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<T>;
}

export function requireDb(): void {
  if (!dbConfigured) {
    throw new McpToolError(
      "Banco de dados nao configurado neste processo. Nenhuma escrita aconteceu.",
      "unavailable"
    );
  }
}

// --------------------------------------------------------------------------
// carimbo de sincronizacao (copia desnormalizada, regra 5 do contrato F1->F3)
// --------------------------------------------------------------------------

export type SyncContextInput = {
  syncRunId?: string;
  source?: SourceFileInput;
};

type BaseStamp = {
  lastSyncRunId: string | null;
  lastMcpTool: string;
  lastApiKeyId: string;
  sourcePath?: string;
};

/** Colunas de rastro presentes em toda entidade-filha. */
export function childStamp(ctx: McpToolContext, sync: SyncContextInput): BaseStamp {
  return {
    lastSyncRunId: sync.syncRunId ?? null,
    lastMcpTool: ctx.tool,
    lastApiKeyId: ctx.apiKeyId,
    ...(sync.source ? { sourcePath: normalizePath(sync.source.path) } : {}),
  };
}

/** `childStamp` + `lastSeenAt` (entidades que registram presenca no vault). */
export function seenStamp(
  ctx: McpToolContext,
  sync: SyncContextInput
): BaseStamp & { lastSeenAt: Date } {
  return { ...childStamp(ctx, sync), lastSeenAt: new Date() };
}

/** Carimbo completo das entidades sincronizaveis de primeira classe. */
export function fullStamp(
  ctx: McpToolContext,
  sync: SyncContextInput
): BaseStamp & {
  lastSeenAt: Date;
  contentSha256?: string;
  sourceGeneration?: SourceGeneration;
} {
  const generation = toSourceGeneration(sync.source?.generation);
  return {
    ...seenStamp(ctx, sync),
    ...(sync.source?.sha256 ? { contentSha256: sync.source.sha256.toLowerCase() } : {}),
    ...(generation ? { sourceGeneration: generation } : {}),
  };
}

// --------------------------------------------------------------------------
// SyncRun
// --------------------------------------------------------------------------

/**
 * Valida o `syncRunId` recebido: precisa existir, estar `running` e pertencer a
 * MESMA chave de API que esta chamando. A ultima condicao evita que uma chave
 * pendure escritas na rodada de outra e envenene o rollback alheio.
 */
export async function assertOpenSyncRun(
  syncRunId: string | undefined,
  ctx: McpToolContext
): Promise<string | undefined> {
  if (!syncRunId) return undefined;
  const run = await db.syncRun.findUnique({
    where: { id: syncRunId },
    select: { id: true, status: true, apiKeyId: true },
  });
  if (!run) {
    throw new McpToolError(
      "syncRunId desconhecido. Abra uma rodada com 'open_sync_run' antes de escrever.",
      "invalid_arguments"
    );
  }
  if (run.status !== "running") {
    throw new McpToolError(
      `A rodada ${syncRunId} esta '${run.status}', nao 'running'. Abra uma nova rodada.`,
      "invalid_arguments"
    );
  }
  if (run.apiKeyId && run.apiKeyId !== ctx.apiKeyId) {
    throw new McpToolError(
      "Esta rodada de sincronizacao pertence a outra chave de API.",
      "invalid_arguments"
    );
  }
  return run.id;
}

/** Contadores da rodada. Best-effort: nunca derruba a escrita que ja ocorreu. */
export async function bumpSyncRun(
  syncRunId: string | undefined,
  delta: Partial<
    Record<"toolCalls" | "filesSeen" | "filesSent" | "entitiesWritten" | "failures", number>
  >
): Promise<void> {
  if (!syncRunId) return;
  const data: Record<string, { increment: number }> = {};
  for (const [key, value] of Object.entries(delta)) {
    if (value && value > 0) data[key] = { increment: value };
  }
  if (Object.keys(data).length === 0) return;
  try {
    await db.syncRun.update({ where: { id: syncRunId }, data });
  } catch {
    // Contador e telemetria da rodada, nao integridade. A proveniencia — que e
    // o que sustenta o rollback — ja foi gravada com o syncRunId.
  }
}

// --------------------------------------------------------------------------
// diff + proveniencia
// --------------------------------------------------------------------------

export type Scalars = Record<string, unknown>;

/**
 * Campos de rastro. Mudam a cada rodada por construcao e nao sao FATO sobre a
 * carreira do usuario — se entrassem no diff, toda re-sincronizacao gravaria
 * `Provenance` e um rollback "restauraria" o carimbo de uma rodada antiga.
 */
const BOOKKEEPING = new Set([
  "lastSeenAt",
  "lastSyncRunId",
  "lastMcpTool",
  "lastApiKeyId",
  "updatedAt",
  "createdAt",
  "id",
  "visibility",
]);

function comparable(value: unknown): string {
  if (value === null || value === undefined) return " null";
  if (value instanceof Date) return `d:${value.toISOString()}`;
  if (Array.isArray(value)) return `a:${JSON.stringify(value)}`;
  if (typeof value === "object") return `o:${JSON.stringify(value)}`;
  return `${typeof value}:${String(value)}`;
}

function jsonSafe(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export type Diff = {
  changed: string[];
  before: Scalars;
  after: Scalars;
};

/**
 * Compara o que sera escrito contra o que ja esta no banco. Devolve apenas os
 * campos que MUDARAM — e a base da idempotencia: sem mudanca, sem proveniencia.
 */
export function pickChanged(before: Scalars | null, next: Scalars): Diff {
  const diff: Diff = { changed: [], before: {}, after: {} };
  for (const [key, value] of Object.entries(next)) {
    if (BOOKKEEPING.has(key) || value === undefined) continue;
    const previous = before ? before[key] : undefined;
    if (before && comparable(previous) === comparable(value)) continue;
    diff.changed.push(key);
    diff.before[key] = before ? (previous ?? null) : null;
    diff.after[key] = value ?? null;
  }
  return diff;
}

export type ProvenanceInput = {
  entityType: string;
  entityId: string;
  field?: string;
  sourcePath?: string;
  sourceGeneration?: SourceGeneration;
  syncRunId?: string;
  /** `null` = a entidade NAO existia. O rollback apaga a linha. */
  before: Scalars | null;
  after: Scalars;
};

/**
 * Grava uma linha de proveniencia. `before === null` marca criacao — e o que
 * permite `revert_sync_run` distinguir "desfazer edicao" de "apagar o que esta
 * rodada criou".
 */
export async function recordProvenance(
  input: ProvenanceInput,
  ctx: McpToolContext
): Promise<void> {
  await db.provenance.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      field: input.field ?? null,
      sourcePath: input.sourcePath ?? null,
      sourceGeneration: input.sourceGeneration ?? null,
      mcpTool: ctx.tool,
      apiKeyId: ctx.apiKeyId,
      // Correlaciona o FATO com a CHAMADA (`McpAuditLog`). Sem isto, dada uma
      // escrita suspeita, so da para chegar ao par (tool, chave) — que se
      // repete centenas de vezes numa rodada. `null` quando a auditoria nao
      // pode ser aberta; nesse caso a tool nem executa (fail-closed em
      // `server.ts`), entao na pratica so aparece em escrita fora do MCP.
      auditId: ctx.auditId,
      syncRunId: input.syncRunId ?? null,
      before: input.before === null ? Prisma.DbNull : jsonSafe(input.before),
      after: jsonSafe(input.after),
    },
  });
}

export type WriteOutcome = {
  id: string;
  criado: boolean;
  alterado: boolean;
  camposAlterados: string[];
};

/**
 * Fecha o ciclo de uma escrita: calcula o diff, grava proveniencia quando algo
 * mudou de fato e devolve o resumo que a tool entrega ao agente.
 */
export async function finishWrite(args: {
  entityType: string;
  entityId: string;
  created: boolean;
  before: Scalars | null;
  after: Scalars;
  sync: SyncContextInput;
  ctx: McpToolContext;
}): Promise<WriteOutcome> {
  const diff = pickChanged(args.created ? null : args.before, args.after);
  const changed = args.created || diff.changed.length > 0;
  if (changed) {
    await recordProvenance(
      {
        entityType: args.entityType,
        entityId: args.entityId,
        sourcePath: args.sync.source ? normalizePath(args.sync.source.path) : undefined,
        sourceGeneration: toSourceGeneration(args.sync.source?.generation),
        syncRunId: args.sync.syncRunId,
        before: args.created ? null : diff.before,
        after: diff.after,
      },
      args.ctx
    );
  }
  return {
    id: args.entityId,
    criado: args.created,
    alterado: changed,
    camposAlterados: args.created ? Object.keys(args.after) : diff.changed,
  };
}

// --------------------------------------------------------------------------
// SyncState
// --------------------------------------------------------------------------

/**
 * Registra o arquivo de origem em `SyncState`. E o que faz a rodada seguinte
 * responder "inalterado" em `check_sync_state` e nao reenviar o corpo — a
 * economia de embedding pedida no briefing.
 */
export async function touchSyncState(args: {
  source: SourceFileInput | undefined;
  entityType: string;
  entityId: string;
  syncRunId?: string;
}): Promise<void> {
  const { source } = args;
  if (!source?.sha256) return;
  const sourcePath = normalizePath(source.path);
  const sha = source.sha256.toLowerCase();
  const common = {
    contentSha256: sha,
    sizeBytes: source.sizeBytes ?? null,
    lastSeenAt: new Date(),
    entityType: args.entityType,
    entityId: args.entityId,
    lastSyncRunId: args.syncRunId ?? null,
  };
  await db.syncState.upsert({
    where: { sourcePath },
    create: { sourcePath, ...common },
    update: common,
  });
}

// --------------------------------------------------------------------------
// paginacao das tools de leitura
// --------------------------------------------------------------------------

export const paginationSchema = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Quantos registros devolver (1-100). Paginacao e server-side."),
  offset: z.number().int().min(0).max(100_000).default(0),
};

// --------------------------------------------------------------------------
// texto de terceiros devolvido ao agente (defesa contra prompt injection)
// --------------------------------------------------------------------------

/**
 * Cerca de texto de terceiro.
 *
 * A implementacao mora em `_untrusted.ts` (modulo puro, sem `server-only` nem
 * Prisma) para conseguir ter teste unitario: e a defesa que separa um anuncio
 * de vaga escrito por outra pessoa das instrucoes do agente, e delimitador sem
 * teste volta quebrado na proxima refatoracao.
 *
 * Prefira `createUntrustedFence()` — UMA cerca por resposta, com nonce citado
 * no `aviso` e nas duas pontas de cada bloco. `UNTRUSTED_NOTICE`/`untrusted()`
 * continuam valendo para as portas que ainda nao carregam cerca propria.
 */
export {
  UNTRUSTED_NOTICE,
  untrusted,
  createUntrustedFence,
  newUntrustedNonce,
  sanitizeUntrustedText,
  type UntrustedFence,
} from "@/lib/mcp/tools/_untrusted";

export function pageInfo(total: number, limit: number, offset: number) {
  return {
    total,
    limit,
    offset,
    temMais: offset + limit < total,
    proximoOffset: offset + limit < total ? offset + limit : null,
  };
}
