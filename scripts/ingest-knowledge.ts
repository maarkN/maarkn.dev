/**
 * Ingests the curated knowledge base (app/knowledge/**.md) into the
 * KnowledgeChunk table as pgvector embeddings, for the RAG chat agent.
 *
 *   npm run db:ingest    (needs OPENAI_API_KEY + DATABASE_URL in the env)
 *
 * Idempotent: clears this script's own rows (`entityType IS NULL`) and
 * re-inserts on every run. Rows written by the MCP (which carry
 * `entityType`/`entityId`) are left untouched.
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
// `framing \(` (e o equivalente pt-BR) cobre TODA nota de enquadramento —
// inclusive "Framing (decided with the user): ... kept out of the CV: sales
// strategy, salary figures, payment disputes", que e material interno e estava
// indo para o indice. As duas linhas de "kept out" existem porque a nota as
// vezes vem na linha seguinte.
const DROP_LINE =
  /⚠️|never mention|internal context|do not use in cv|version-controlled secrets|framing \(|framing note|enquadramento \(|kept \*\*out\*\*|kept out of the cv|mantido \*\*fora\*\*|fora do cv|nda\b/i;
const STRIP_TOKEN =
  /`?\[(code|user|inference|código|usuário|inferência)\]`?|_\((?:a preencher|to be filled)\)_/gi;

function sanitize(md: string): string {
  return md
    .split("\n")
    .filter((line) => !DROP_LINE.test(line))
    .map((line) => line.replace(STRIP_TOKEN, "").trimEnd())
    .join("\n");
}

// --- particao publico/privado do corpus (F7 — exfiltracao) ------------------
//
// ANTES: todo arquivo de `knowledge/**` era gravado com `visibility = 'public'`,
// o que colocava os dossies de projeto — com nome real de cliente, notas de
// enquadramento e metricas nao confirmadas — no indice que o chat PUBLICO
// consulta. O site expoe esses mesmos projetos com nome anonimizado
// (`fintech-loan-api`, `carbon-credit-platform`, ...), entao bastava perguntar
// ao chat "quem foi o cliente do drug-leaflet-platform?" para desfazer a
// anonimizacao. A unica barreira era uma frase no system prompt — e o briefing
// e explicito: a defesa tem que ser particao no dado, na query SQL.
//
// AGORA: `private` e o default. Um arquivo so entra no indice publico quando
// declara isso, e a declaracao e do humano que escreveu o arquivo:
//
//   - a primeira linha util do arquivo contem `visibility: public`
//     (frontmatter YAML ou `<!-- visibility: public -->`); ou
//   - o caminho relativo esta em `KNOWLEDGE_PUBLIC_SOURCES` (lista separada por
//     virgula; default `cv.md`, que e material que ja circula publicamente).
//
// O corpus privado continua alimentando o gerador de CV/carta (que roda
// autenticado e filtra por `GENERATION_ENTITY_TYPES`), so nao alimenta o chat
// anonimo.
const PUBLIC_MARKER = /^\s*(?:<!--\s*)?visibility\s*:\s*public\b/im;
const PUBLIC_SOURCES = new Set(
  (process.env.KNOWLEDGE_PUBLIC_SOURCES ?? "cv.md")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
);

function visibilityOf(source: string, raw: string): "public" | "private" {
  if (PUBLIC_SOURCES.has(source)) return "public";
  // So o cabecalho decide: um `visibility: public` no meio da prosa nao promove
  // o arquivo (e seria trivial de introduzir sem querer, colando texto).
  return PUBLIC_MARKER.test(raw.split("\n").slice(0, 20).join("\n"))
    ? "public"
    : "private";
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
    visibility: "public" | "private";
  }[] = [];

  for (const file of files) {
    const source = file.slice(KNOWLEDGE_DIR.length + 1);
    const raw = readFileSync(file, "utf8");
    const visibility = visibilityOf(source, raw);
    const md = sanitize(raw);
    chunkMarkdown(md).forEach((c, i) =>
      records.push({
        source,
        title: c.title,
        content: c.content,
        chunkIndex: i,
        visibility,
      })
    );
    console.log(`[ingest] ${visibility === "public" ? "PUBLICO " : "privado "} ${source}`);
  }
  const publicos = records.filter((r) => r.visibility === "public").length;
  console.log(
    `[ingest] ${files.length} files -> ${records.length} chunks ` +
      `(${publicos} publicos / ${records.length - publicos} privados)`
  );

  const vectors = await embedBatch(
    records.map((r) => r.content),
    apiKey
  );
  console.log(`[ingest] embedded ${vectors.length} chunks`);

  // F1: so limpa o corpus curado deste script (`entityType IS NULL`). Chunks
  // escritos pelo MCP carregam `entityType`/`entityId` e NAO podem ser
  // apagados por uma reingestao do knowledge/ — senao todo deploy destroi a
  // sincronizacao do vault.
  await db.$executeRaw`DELETE FROM "KnowledgeChunk" WHERE "entityType" IS NULL`;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const literal = toVectorLiteral(vectors[i]);
    // `visibility` vem de `visibilityOf()` — private por default, public so
    // quando o arquivo (ou KNOWLEDGE_PUBLIC_SOURCES) declara. Nunca escreva
    // 'public' fixo aqui: e o que colocava dossie de cliente no chat anonimo.
    await db.$executeRaw`
      INSERT INTO "KnowledgeChunk" (id, source, "sourceType", title, content, "chunkIndex", embedding, visibility, "embeddedAt")
      VALUES (${randomUUID()}, ${r.source}, ${"dossier"}, ${r.title}, ${r.content}, ${r.chunkIndex}, ${literal}::vector, ${r.visibility}::"visibility", NOW())
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
