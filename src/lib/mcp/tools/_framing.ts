import "server-only";
import { db } from "@/lib/db";
import { isOwnEmail, isOwnPhone, safeErrorMessage } from "@/lib/mcp/redact";

/**
 * Validador deterministico das regras invioláveis de enquadramento (R1-R8).
 *
 * O briefing e explicito: "Escreva isso como validador deterministico + um
 * agente critico, **nao como instrucao no prompt**". Um LLM instruido a nao
 * escrever "degree" escreve "degree" eventualmente; uma regex nao.
 *
 * As regras vem de `FramingRule` (populado pelo seed, editavel na UI do admin),
 * nunca hardcoded — F4 continua deste ponto.
 *
 * Nota para F4: se este validador precisar rodar fora do MCP (nas Server
 * Actions do gerador), mova o arquivo para `src/lib/framing.ts` e importe dos
 * dois lados. Ele nao depende de nada do MCP de proposito.
 */

export type FramingTarget = "resume" | "cover_letter" | "screening";

export type FramingViolation = {
  code: string;
  title: string;
  severity: string;
  campo: FramingTarget;
  padrao: string;
  trecho: string;
};

export type FramingVerdict = {
  passed: boolean;
  regrasVerificadas: number;
  violacoes: FramingViolation[];
  bloqueantes: number;
};

/**
 * As violacoes SEC nao carregam o trecho ofensor. Devolver 80 chars em volta do
 * e-mail vazado transformaria o proprio bloqueio num oraculo de exfiltracao: o
 * atacante repetiria a chamada variando o spec e leria o corpus privado pedaco
 * a pedaco pelas mensagens de erro. O texto integral fica em
 * `GeneratedResume.contentMd`, visivel so para o admin autenticado.
 */
const SEC_EXCERPT =
  "[trecho omitido: contem o dado de terceiro que motivou o bloqueio — veja o registro em /admin]";

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** So numero em formato internacional explicito: `+55 62 ...`, `+1 (555) ...`. */
const PHONE_RE = /\+\d[\d\s().-]{6,}\d/g;

/**
 * Regras de SEGURANCA embutidas (nao vem do banco, nao sao editaveis na UI).
 *
 * Por que embutidas: as regras R1-R8 sao editoriais e vivem em `FramingRule`,
 * onde o admin as ajusta. Estas duas sao **invariantes de vazamento** — a
 * ultima barreira determinística entre o corpus privado e um texto que sai do
 * servidor. Um CV/carta gerado so pode carregar o contato do proprio Marco;
 * e-mail ou telefone de terceiro no texto significa que o modelo copiou PII do
 * contexto (tipicamente por injecao no job spec, que e texto de terceiro).
 * Bloquear e a resposta certa: o texto nao e devolvido.
 */
function securityViolations(
  texts: Partial<Record<FramingTarget, string | undefined>>
): FramingViolation[] {
  const out: FramingViolation[] = [];

  for (const [target, text] of Object.entries(texts) as [
    FramingTarget,
    string | undefined,
  ][]) {
    if (!text) continue;
    const scanned = text.slice(0, MAX_SCAN_CHARS);

    EMAIL_RE.lastIndex = 0;
    for (const match of scanned.matchAll(EMAIL_RE)) {
      if (isOwnEmail(match[0])) continue;
      out.push({
        code: "SEC1",
        title: "E-mail de terceiro no material gerado (PII vazada do contexto)",
        severity: "blocking",
        campo: target,
        padrao: "e-mail fora da allowlist de contatos proprios",
        trecho: SEC_EXCERPT,
      });
      break;
    }

    PHONE_RE.lastIndex = 0;
    for (const match of scanned.matchAll(PHONE_RE)) {
      if (isOwnPhone(match[0])) continue;
      out.push({
        code: "SEC2",
        title: "Telefone de terceiro no material gerado (PII vazada do contexto)",
        severity: "blocking",
        campo: target,
        padrao: "telefone internacional fora da allowlist de contatos proprios",
        trecho: SEC_EXCERPT,
      });
      break;
    }
  }

  return out;
}

/** Um texto absurdo nao vira 8 varreduras de regex de custo ilimitado. */
const MAX_SCAN_CHARS = 200_000;
/** Padrao vindo do banco tambem e entrada: regex gigante e recusada. */
const MAX_PATTERN_CHARS = 500;

function excerpt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + length + 40);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ")}${end < text.length ? "…" : ""}`;
}

function appliesTo(scope: string, target: FramingTarget): boolean {
  if (scope === "all" || !scope) return true;
  return scope === target;
}

/**
 * Verifica os textos gerados contra as regras ativas.
 *
 * `passed` e false quando ha ao menos uma violacao de severidade `blocking` —
 * e o texto NAO deve ser entregue. Violacoes `warning` sao devolvidas junto,
 * para o agente corrigir, mas nao reprovam.
 */
export async function validateFraming(
  texts: Partial<Record<FramingTarget, string | undefined>>
): Promise<FramingVerdict> {
  const rules = await db.framingRule.findMany({
    where: { active: true },
    select: { code: true, title: true, severity: true, scope: true, forbiddenPatterns: true },
    orderBy: { code: "asc" },
  });

  // Invariantes de vazamento primeiro: valem mesmo que `FramingRule` esteja
  // vazia (banco recem-migrado) ou que alguem desative uma regra na UI.
  const violacoes: FramingViolation[] = securityViolations(texts);

  for (const rule of rules) {
    for (const raw of rule.forbiddenPatterns) {
      if (!raw || raw.length > MAX_PATTERN_CHARS) continue;
      let regex: RegExp;
      try {
        regex = new RegExp(raw, "giu");
      } catch {
        try {
          regex = new RegExp(raw, "gi");
        } catch (err) {
          console.error(
            `[mcp] regra ${rule.code} tem padrao invalido:`,
            safeErrorMessage(err)
          );
          continue;
        }
      }

      for (const [target, text] of Object.entries(texts) as [
        FramingTarget,
        string | undefined,
      ][]) {
        if (!text || !appliesTo(rule.scope, target)) continue;
        const scanned = text.slice(0, MAX_SCAN_CHARS);
        regex.lastIndex = 0;
        const match = regex.exec(scanned);
        if (!match) continue;
        violacoes.push({
          code: rule.code,
          title: rule.title,
          severity: rule.severity,
          campo: target,
          padrao: raw,
          trecho: excerpt(scanned, match.index, match[0].length),
        });
      }
    }
  }

  const bloqueantes = violacoes.filter((v) => v.severity === "blocking").length;
  return {
    passed: bloqueantes === 0,
    // +2 = SEC1/SEC2, as invariantes de vazamento embutidas.
    regrasVerificadas: rules.length + 2,
    violacoes,
    bloqueantes,
  };
}
