/**
 * Redacao de segredos.
 *
 * Regra dura de F3: **a chave de API nunca aparece em log, erro, resposta nem
 * stack trace**. Como o repositorio e publico, o atacante sabe exatamente qual
 * e o formato do token (`mk_live_` + 43 chars base64url) — o que ele nao pode
 * conseguir e que o proprio sistema imprima um token valido em algum lugar
 * legivel (log do Docker, tabela de auditoria, corpo de erro devolvido ao
 * cliente).
 *
 * Este modulo e o unico lugar que decide o que e segredo. Use-o antes de
 * qualquer `console.*`, antes de gravar `McpAuditLog.argsSummary`/`result` e
 * antes de devolver mensagem de erro.
 */

const REDACTED = "[redigido]";

/** Token do MCP em qualquer texto. */
const MCP_TOKEN_RE = /\bmk_(?:live|test)_[A-Za-z0-9_-]{8,}/g;
/** `Authorization: Bearer <algo>` / `Bearer <algo>` em qualquer texto. */
const BEARER_RE = /\b(bearer)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
/** Chaves da OpenAI e afins, que passam por aqui via job spec colado. */
const OPENAI_KEY_RE = /\bsk-[A-Za-z0-9_-]{16,}/g;
/** JWT (o cookie de sessao do NextAuth, se algum dia cair num payload). */
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
/** URL de conexao do Postgres com senha embutida. */
const PG_URL_RE = /\bpostgres(?:ql)?:\/\/[^\s"']+/gi;

// ---------------------------------------------------------------------------
// PII de terceiros (F7 — lente de exfiltracao)
// ---------------------------------------------------------------------------
//
// `get_application` promete, na propria descricao, que "e-mail e telefone de
// contatos NAO sao devolvidos por esta porta". A promessa era verdadeira para a
// tabela `Contact` e falsa para tudo o que e prosa: o mesmo telefone volta em
// `notesMd`, `summaryMd` ou no corpo de um `ApplicationEvent`, porque e assim
// que a nota do vault e escrita ("liguei para a Jane, +1-555-0142"). Mascarar
// no ponto de saida faz a promessa valer para os dois caminhos.

/** Contatos do proprio Marco — os unicos que podem sair em claro. */
const OWN_CONTACTS = (
  process.env.GENERATOR_OWN_CONTACTS || "markimkr@gmail.com,+55 62 98173 6748"
)
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

const OWN_EMAILS: ReadonlySet<string> = new Set(
  OWN_CONTACTS.filter((entry) => entry.includes("@"))
);
const OWN_PHONE_DIGITS: readonly string[] = OWN_CONTACTS.filter(
  (entry) => !entry.includes("@")
).map((entry) => entry.replace(/\D/g, ""));

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** So numero em formato internacional explicito: `+55 62 ...`, `+1 (555) ...`. */
const PHONE_RE = /\+\d[\d\s().-]{6,}\d/g;

export function isOwnEmail(value: string): boolean {
  return OWN_EMAILS.has(value.toLowerCase());
}

export function isOwnPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return OWN_PHONE_DIGITS.some((own) => own && (own === digits || own.endsWith(digits)));
}

/**
 * Mascara e-mail e telefone de TERCEIROS em texto livre devolvido por uma tool.
 * Idempotente. Mantem os contatos do proprio Marco (uma carta gerada precisa do
 * cabecalho dele).
 */
export function maskContactPii<T extends string | null | undefined>(text: T): T {
  if (typeof text !== "string" || !text) return text;
  return text
    .replace(EMAIL_RE, (m) => (isOwnEmail(m) ? m : "[e-mail omitido]"))
    .replace(PHONE_RE, (m) => (isOwnPhone(m) ? m : "[telefone omitido]")) as T;
}

/** Nomes de campo que nunca devem ter o valor persistido/logado. */
const SECRET_KEY_RE =
  /(?:^|_|-)?(?:api[_-]?key|apikey|key|token|secret|password|passwd|senha|authorization|auth|credential|pepper|cookie|session)(?:$|_|-)?/i;

/**
 * Remove segredos de um texto livre. Idempotente e barato — chame sempre, nao
 * "so quando parecer necessario".
 */
export function redactText(input: string): string {
  return input
    .replace(MCP_TOKEN_RE, REDACTED)
    .replace(BEARER_RE, `$1 ${REDACTED}`)
    .replace(OPENAI_KEY_RE, REDACTED)
    .replace(JWT_RE, REDACTED)
    .replace(PG_URL_RE, REDACTED);
}

/** Um campo com este nome tem o valor substituido, qualquer que seja ele. */
export function isSecretFieldName(name: string): boolean {
  return SECRET_KEY_RE.test(name);
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/**
 * Copia profunda com segredos removidos: valor de campo com nome suspeito vira
 * `[redigido]`, string livre passa por `redactText`, e a profundidade/tamanho e
 * limitada para que um payload hostil nao exploda a memoria da auditoria.
 */
export function redactValue(value: unknown, depth = 0): Json {
  if (depth > 6) return "[profundo demais]";
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const head = value.slice(0, 50).map((item) => redactValue(item, depth + 1));
    if (value.length > 50) head.push(`[+${value.length - 50} itens]`);
    return head;
  }
  if (typeof value === "object") {
    const out: { [k: string]: Json } = {};
    let n = 0;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (n >= 50) {
        out["…"] = "[+campos omitidos]";
        break;
      }
      out[k] = isSecretFieldName(k) ? REDACTED : redactValue(v, depth + 1);
      n += 1;
    }
    return out;
  }
  // function, symbol, bigint: nao deveriam chegar aqui vindos de JSON.
  return `[${typeof value}]`;
}

/**
 * Resumo de argumentos pronto para `McpAuditLog.argsSummary`: redigido,
 * serializado e truncado. Nunca guarde o payload cru — um upsert de dossie
 * carrega markdown inteiro e o log viraria uma segunda copia do vault.
 */
export function summarizeForAudit(value: unknown, maxChars = 2000): string {
  let text: string;
  try {
    text = JSON.stringify(redactValue(value)) ?? "null";
  } catch {
    text = "[nao serializavel]";
  }
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…[truncado ${text.length - maxChars}]`;
}

/**
 * Mensagem de erro segura para log/auditoria: sem stack (que pode carregar o
 * token no frame de uma chamada) e sem segredo no texto.
 */
export function safeErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === "string"
        ? err
        : "erro desconhecido";
  return redactText(raw).slice(0, 500);
}
