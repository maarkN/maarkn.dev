/**
 * OpenAI embeddings helpers. Intentionally free of the "server-only" marker so
 * the standalone ingestion script (run via tsx) can import it too.
 */
const EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const ENDPOINT = "https://api.openai.com/v1/embeddings";

/** pgvector accepts a string literal like "[0.1,0.2,...]" cast to ::vector. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

async function callEmbeddings(
  input: string | string[],
  apiKey: string
): Promise<number[][]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`embeddings request failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    data: { embedding: number[]; index: number }[];
  };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embed(text: string, apiKey: string): Promise<number[]> {
  const [vec] = await callEmbeddings(text, apiKey);
  return vec;
}

export async function embedBatch(
  texts: string[],
  apiKey: string,
  batchSize = 50
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const vecs = await callEmbeddings(texts.slice(i, i + batchSize), apiKey);
    out.push(...vecs);
  }
  return out;
}
