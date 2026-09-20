"use server";

/**
 * Gerador de candidatura pelo painel `/admin`.
 *
 * Esta action e a MESMA funcionalidade da tool `generate_resume` do MCP
 * (`src/lib/mcp/tools/resume.ts`), so que acionada pela tela. As duas barreiras
 * que o caminho do MCP tem, portanto, valem aqui — foram escritas contra o
 * conteudo do job spec, nao contra o transporte:
 *
 * 1. **O job spec e dado de terceiro.** Chega ao modelo dentro da mesma cerca
 *    que `generate_resume` usa — `createUntrustedFence().wrapJobSpec()`, de
 *    `@/lib/mcp/tools/_untrusted` — com nonce por chamada, para que o proprio
 *    anuncio nao consiga escrever o fechamento e sair do bloco. Ordem escrita
 *    dentro do anuncio e texto, nao instrucao.
 * 2. **O texto gerado passa pelo validador deterministico** `validateFraming()`
 *    (`@/lib/mcp/tools/_framing`), que carrega as regras editoriais R1-R8 e as
 *    invariantes de vazamento SEC1/SEC2 — e-mail/telefone de terceiro no
 *    material gerado significa que o modelo copiou PII do corpus privado. Com
 *    violacao bloqueante o texto NAO e devolvido e NADA e gravado.
 *
 * Os dois modulos sao importados do MCP de proposito: duplicar a defesa aqui
 * garantiria que um dia as duas copias divirjam. (O cabecalho de `_framing.ts`
 * preve mover o arquivo para `src/lib/framing.ts` quando ele rodar dos dois
 * lados — decisao do dono, o import ja funciona.)
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { generateApplication } from "@/lib/generator";
import { safeDbError } from "@/lib/safe-error";
import { createUntrustedFence } from "@/lib/mcp/tools/_untrusted";
import { validateFraming } from "@/lib/mcp/tools/_framing";

export type GenState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      id: string;
      resume: string;
      coverLetter: string;
      screeningAnswers: string;
      sources: string[];
    };

const schema = z.object({
  jobDescription: z.string().min(40).max(20000),
  language: z.enum(["en", "pt-BR"]),
  company: z.string().max(160).optional(),
  roleTitle: z.string().max(160).optional(),
});

/** Erros esperados do gerador: codigo estavel, seguro para o log. */
const GENERATOR_SENTINELS = new Set(["no_api_key", "no_context"]);

export async function generate(_prev: GenState, formData: FormData): Promise<GenState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "unauthorized" };
  if (!dbConfigured) return { status: "error", message: "db_unavailable" };

  const input = {
    jobDescription: String(formData.get("jobDescription") ?? "").trim(),
    language: String(formData.get("language") ?? "en") as "en" | "pt-BR",
    company: String(formData.get("company") ?? "").trim() || undefined,
    roleTitle: String(formData.get("roleTitle") ?? "").trim() || undefined,
  };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Paste a fuller job description (40+ characters)." };
  }

  // Delimita o spec ANTES de o modelo ve-lo, com o mesmo helper do caminho do
  // MCP: nonce por chamada + limpeza dos delimitadores escritos dentro do
  // proprio anuncio, entao o texto colado nao consegue "sair" do bloco e virar
  // instrucao.
  const jobDescription = createUntrustedFence().wrapJobSpec(parsed.data.jobDescription);

  let out;
  try {
    out = await generateApplication({
      ...parsed.data,
      jobDescription,
      // A cerca e para o PROMPT. A busca semantica usa o spec CRU: o nonce da
      // cerca e aleatorio por chamada, entao mandar o texto cercado faria o
      // mesmo spec recuperar chunks diferentes a cada geracao — e, em spec
      // curto, o texto da cerca dominaria o vetor.
      retrievalQuery: parsed.data.jobDescription,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    // Erro do provedor pode carregar pedaco do prompt (= corpus privado + spec).
    console.error("[generator] failed:", GENERATOR_SENTINELS.has(msg) ? msg : safeDbError(err));
    if (msg === "no_api_key")
      return { status: "error", message: "OPENAI_API_KEY is not set on the server." };
    if (msg === "no_context")
      return { status: "error", message: "Knowledge base is empty — run `npm run db:ingest`." };
    return { status: "error", message: "Generation failed. Check the server logs and try again." };
  }

  let verdict;
  try {
    verdict = await validateFraming({
      resume: out.resume,
      cover_letter: out.coverLetter,
      screening: out.screeningAnswers,
    });
  } catch (err) {
    // Barreira de vazamento: sem veredito, nao ha entrega. Falha fechada.
    console.error("[generator] framing validation failed", safeDbError(err));
    return {
      status: "error",
      message: "The framing validator did not run — nothing was generated or saved.",
    };
  }

  if (!verdict.passed) {
    // So os codigos: o trecho ofensor viraria um oraculo de exfiltracao do
    // corpus privado (mesma razao do `SEC_EXCERPT` em `_framing.ts`).
    const codes = [...new Set(verdict.violacoes.map((v) => v.code))].join(", ");
    console.error("[generator] blocked by framing validator:", codes);
    return {
      status: "error",
      message: `Blocked by the framing validator (${verdict.bloqueantes} blocking violation(s): ${codes}). Nothing was saved.`,
    };
  }

  let id = "";
  try {
    const rec = await db.generation.create({
      data: {
        company: parsed.data.company ?? null,
        roleTitle: parsed.data.roleTitle ?? null,
        language: parsed.data.language,
        // Grava o spec como o admin colou: a delimitacao e do prompt, nao do dado.
        jobDescription: parsed.data.jobDescription,
        resume: out.resume,
        coverLetter: out.coverLetter,
        screeningAnswers: out.screeningAnswers,
        sourcesJson: JSON.stringify(out.sources),
      },
    });
    id = rec.id;
    revalidatePath("/admin/generator");
  } catch (err) {
    // `err` cru aqui imprimiria o CV e a carta inteiros no log do container.
    console.error("[generator] save failed", safeDbError(err));
  }

  return {
    status: "success",
    id,
    resume: out.resume,
    coverLetter: out.coverLetter,
    screeningAnswers: out.screeningAnswers,
    sources: out.sources,
  };
}
