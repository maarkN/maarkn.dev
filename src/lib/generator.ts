import "server-only";
import { retrieve, formatContext } from "@/lib/rag";

export type GeneratorInput = {
  jobDescription: string;
  language: "en" | "pt-BR";
  company?: string;
  roleTitle?: string;
};

export type GeneratorOutput = {
  resume: string;
  coverLetter: string;
  screeningAnswers: string;
  sources: string[];
};

function buildSystemPrompt(lang: string): string {
  return `You are an expert technical résumé and cover-letter writer producing job-application materials FOR Marco Filho — a Senior AI/LLM & Backend Software Engineer.

ABSOLUTE RULES (honesty — non-negotiable):
- Use ONLY facts present in the CONTEXT block (Marco's real CV and project dossiers). It is the single source of truth.
- NEVER invent or embellish: no fake employers, dates, job titles, metrics, certifications, or technologies he hasn't used.
- Marco has NO formal university degree. NEVER claim or imply one, and do not add an "Education" section.
- Only use metrics that appear in the context verbatim (e.g. "246 municipal portals", "~60% pilot savings", "21 vulnerabilities", "522/1,062 commits"). Never fabricate numbers.
- If the job needs skills Marco lacks, don't pretend. Emphasize the closest real experience and his proven ability to learn fast; in the cover letter you may honestly acknowledge a gap.

TASK: tailor the materials to the JOB. Mirror the job's real keywords and requirements only where they truthfully match Marco's context. Lead with the projects and stack most relevant to THIS role.

TONE: plain, confident, honest. No buzzwords or fluff. First person ("I…") in the cover letter and screening answers; standard résumé style in the résumé.

CONTACT (résumé header / sign-off): Marco Filho · markimkr@gmail.com · linkedin.com/in/maarkn · maarkn.dev

OUTPUT: a single JSON object with exactly these string keys, every value written in ${lang} and formatted in Markdown:
- "resume": a complete one–two page résumé tailored to the job (header, summary, skills, experience with the most relevant bullets, languages).
- "coverLetter": a concise cover letter, 3–4 short paragraphs, addressed to the company.
- "screeningAnswers": 3–6 likely pre-screening questions for this role, each as "**Q:** …" then "**A:** …", with honest, specific answers.
Return ONLY the JSON object — no prose, no code fences.`;
}

export async function generateApplication(
  input: GeneratorInput
): Promise<GeneratorOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("replace-me")) throw new Error("no_api_key");
  const model =
    process.env.OPENAI_GENERATOR_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  const chunks = await retrieve(input.jobDescription, { k: 10, apiKey });
  const context = formatContext(chunks);
  if (!context) throw new Error("no_context");

  const lang = input.language === "pt-BR" ? "Brazilian Portuguese" : "English";
  const header = [
    input.roleTitle ? `Role: ${input.roleTitle}` : null,
    input.company ? `Company: ${input.company}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const userContent = `${header ? header + "\n\n" : ""}JOB DESCRIPTION:\n${input.jobDescription}\n\nCONTEXT — Marco's real CV & project dossiers (the ONLY source of truth):\n${context}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(lang) },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`openai_${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content ?? "{}";

  let parsed: { resume?: string; coverLetter?: string; screeningAnswers?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("bad_json");
  }

  return {
    resume: String(parsed.resume ?? "").trim(),
    coverLetter: String(parsed.coverLetter ?? "").trim(),
    screeningAnswers: String(parsed.screeningAnswers ?? "").trim(),
    sources: [...new Set(chunks.map((c) => c.source))],
  };
}
