import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { embed, toVectorLiteral } from "@/lib/embeddings";

export type RetrievedChunk = {
  source: string;
  title: string | null;
  content: string;
  score: number;
};

/**
 * Entidades cujo conteudo pode virar material de candidatura (CV, carta,
 * respostas de triagem).
 *
 * SEGURANCA (F7 / exfiltracao): `includePrivate: true` sozinho e um cheque em
 * branco — devolve QUALQUER chunk privado para quem controla a pergunta. E o
 * gerador e alimentado por job spec, que e texto de terceiro: quem escreve o
 * spec escolhe, na pratica, quais chunks privados sao recuperados e depois
 * copiados para dentro do texto gerado. Por isso a particao nao para em
 * `visibility`: a geracao enxerga apenas a **evidencia de carreira**, nunca as
 * entidades de PII de terceiros e de negociacao (`Contact`,
 * `ProfessionalReference`, `SalaryExpectation`, `ApplicationEvent`,
 * `Interview`, ...).
 *
 * A lista e **allowlist** de proposito: um `entityType` novo (F3b/F4) nasce
 * fora do corpus de geracao ate alguem decidir, explicitamente, que aquele
 * material pode virar CV. Errar para menos aqui e um bullet faltando; errar
 * para mais e telefone de recrutador num currículo enviado a terceiro.
 */
export const GENERATION_ENTITY_TYPES = [
  "Experience",
  "CareerProject",
  "Document",
  "ResumeBullet",
  "Skill",
  "RequirementCoverage",
  "Job",
  "Post",
] as const;

/**
 * Semantic search over the KnowledgeChunk table (pgvector, cosine distance).
 * Returns [] (never throws) when there is no API key, no query, or on any
 * failure — the chat route degrades to the base system prompt.
 *
 * SEGURANCA (F1): a particao publico/privado e aplicada AQUI, na query SQL,
 * nunca por instrucao no system prompt. `KnowledgeChunk.visibility` nasce
 * `private` (default do schema), portanto o padrao desta funcao e
 * fail-closed: so retorna chunks `public`. Chamadas do lado admin — o gerador
 * de CV/carta, que roda atras de `requireAdmin()` — passam
 * `includePrivate: true` explicitamente. O chat publico NUNCA passa.
 */
export async function retrieve(
  query: string,
  opts: {
    k?: number;
    apiKey?: string;
    includePrivate?: boolean;
    /**
     * Quando presente, restringe o corpus aos chunks do corpus curado
     * (`entityType IS NULL`) e aos `entityType` listados. Ver
     * `GENERATION_ENTITY_TYPES`.
     */
    entityTypes?: readonly string[];
  } = {}
): Promise<RetrievedChunk[]> {
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("replace-me") || !query.trim()) return [];
  const k = opts.k ?? 6;
  const includePrivate = opts.includePrivate === true;

  let literal: string;
  try {
    literal = toVectorLiteral(await embed(query, apiKey));
  } catch (err) {
    console.error("[rag] query embedding failed", err);
    return [];
  }

  // Filtro de entidade, tambem na query SQL (nunca no prompt). `entityTypes`
  // vazio significaria "so o corpus curado" — nao vira `IN ()` invalido.
  const allowed = opts.entityTypes;
  const entityFilter = allowed
    ? allowed.length > 0
      ? Prisma.sql`AND ("entityType" IS NULL OR "entityType" IN (${Prisma.join([...allowed])}))`
      : Prisma.sql`AND "entityType" IS NULL`
    : Prisma.empty;

  try {
    return await db.$queryRaw<RetrievedChunk[]>`
      SELECT source, title, content, 1 - (embedding <=> ${literal}::vector) AS score
      FROM "KnowledgeChunk"
      WHERE embedding IS NOT NULL
        AND (${includePrivate} OR "visibility" = 'public'::"visibility")
        ${entityFilter}
      ORDER BY embedding <=> ${literal}::vector
      LIMIT ${k}
    `;
  } catch (err) {
    console.error("[rag] retrieval query failed", err);
    return [];
  }
}

/** Formats retrieved chunks into a context block for the system prompt. */
export function formatContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] ${c.source}${c.title ? ` › ${c.title}` : ""}\n${c.content}`
    )
    .join("\n\n");
}
