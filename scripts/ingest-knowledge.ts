/**
 * Ingests the curated knowledge base (app/knowledge/**.md) into the
 * KnowledgeChunk table as pgvector embeddings, for the RAG chat agent.
 *
 *   npm run db:ingest    (needs OPENAI_API_KEY + DATABASE_URL in the env)
 *
 * Idempotent: clears the table and re-inserts on every run.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { embedBatch, toVectorLiteral } from "../src/lib/embeddings";

const db = new PrismaClient();
const KNOWLEDGE_DIR = join(process.cwd(), "knowledge");
const MAX_CHARS = 1100;

// --- defense in depth: strip any internal/sensitive notes that slipped in ---
const DROP_LINE =
  /⚠️|never mention|internal context|do not use in cv|version-controlled secrets|framing \(option|framing note|nda\b/i;
const STRIP_TOKEN =
  /`?\[(code|user|inference|código|usuário|inferência)\]`?|_\((?:a preencher|to be filled)\)_/gi;

function sanitize(md: string): string {
  return md
    .split("\n")
    .filter((line) => !DROP_LINE.test(line))
    .map((line) => line.replace(STRIP_TOKEN, "").trimEnd())
    .join("\n");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out.sort();
}

function chunkMarkdown(md: string): { title: string | null; content: string }[] {
  const sections: { title: string | null; body: string[] }[] = [];
  let cur: { title: string | null; body: string[] } = { title: null, body: [] };
  for (const line of md.split("\n")) {
    const h = line.match(/^#{1,3}\s+(.*)$/);
    if (h) {
      if (cur.body.join("").trim()) sections.push(cur);
      cur = { title: h[1].trim(), body: [] };
    } else {
      cur.body.push(line);
    }
  }
  if (cur.body.join("").trim()) sections.push(cur);

  const chunks: { title: string | null; content: string }[] = [];
  const wrap = (title: string | null, text: string) =>
    (title ? `## ${title}\n` : "") + text.trim();

  for (const s of sections) {
    const text = s.body.join("\n").trim();
    if (!text) continue;
    if (text.length <= MAX_CHARS) {
      chunks.push({ title: s.title, content: wrap(s.title, text) });
      continue;
    }
    let buf = "";
    for (const para of text.split(/\n{2,}/)) {
      if (buf && (buf + "\n\n" + para).length > MAX_CHARS) {
        chunks.push({ title: s.title, content: wrap(s.title, buf) });
        buf = para;
      } else {
        buf = buf ? `${buf}\n\n${para}` : para;
      }
    }
    if (buf.trim()) chunks.push({ title: s.title, content: wrap(s.title, buf) });
  }
  return chunks.filter((c) => c.content.trim().length > 20);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("replace-me")) {
    throw new Error("OPENAI_API_KEY is required to ingest the knowledge base.");
  }

  const files = walk(KNOWLEDGE_DIR);
  const records: {
    source: string;
    title: string | null;
    content: string;
    chunkIndex: number;
  }[] = [];

  for (const file of files) {
    const source = file.slice(KNOWLEDGE_DIR.length + 1);
    const md = sanitize(readFileSync(file, "utf8"));
    chunkMarkdown(md).forEach((c, i) =>
      records.push({ source, title: c.title, content: c.content, chunkIndex: i })
    );
  }
  console.log(`[ingest] ${files.length} files -> ${records.length} chunks`);

  const vectors = await embedBatch(
    records.map((r) => r.content),
    apiKey
  );
  console.log(`[ingest] embedded ${vectors.length} chunks`);

  await db.$executeRaw`DELETE FROM "KnowledgeChunk"`;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const literal = toVectorLiteral(vectors[i]);
    await db.$executeRaw`
      INSERT INTO "KnowledgeChunk" (id, source, "sourceType", title, content, "chunkIndex", embedding)
      VALUES (${randomUUID()}, ${r.source}, ${"dossier"}, ${r.title}, ${r.content}, ${r.chunkIndex}, ${literal}::vector)
    `;
  }

  // No ANN index at this scale: exact cosine over a few hundred chunks is
  // sub-millisecond. If the knowledge base grows large, add an HNSW index via a
  // dedicated Prisma migration (raw SQL) so it stays in migration history.

  const count = await db.knowledgeChunk.count();
  console.log(`[ingest] done. KnowledgeChunk rows = ${count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
