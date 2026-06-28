import "server-only";
import { db } from "@/lib/db";
import { embed, toVectorLiteral } from "@/lib/embeddings";

export type RetrievedChunk = {
  source: string;
  title: string | null;
  content: string;
  score: number;
};

/**
 * Semantic search over the KnowledgeChunk table (pgvector, cosine distance).
 * Returns [] (never throws) when there is no API key, no query, or on any
 * failure — the chat route degrades to the base system prompt.
 */
export async function retrieve(
  query: string,
  opts: { k?: number; apiKey?: string } = {}
): Promise<RetrievedChunk[]> {
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("replace-me") || !query.trim()) return [];
  const k = opts.k ?? 6;

  let literal: string;
  try {
    literal = toVectorLiteral(await embed(query, apiKey));
  } catch (err) {
    console.error("[rag] query embedding failed", err);
    return [];
  }

  try {
    return await db.$queryRaw<RetrievedChunk[]>`
      SELECT source, title, content, 1 - (embedding <=> ${literal}::vector) AS score
      FROM "KnowledgeChunk"
      WHERE embedding IS NOT NULL
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
