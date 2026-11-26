/**
 * Vocabulário do RADAR de vagas — a camada que o `/admin/jobs` mostra por cima
 * de `Job`.
 *
 * Este módulo é importável pelo CLIENTE (a toolbar usa os rótulos) e por isso
 * não toca no Prisma nem em `@/lib/db`. O `/**
 * Sentinela do filtro "vaga sem veredito de radar" (o Radix proíbe `value=""`).
 * Colide com um veredito que se chamasse literalmente `none` — improvável o
 * bastante para não pagar o preço de um parâmetro de URL a mais, e a colisão
 * seria visível na hora (a opção some da lista, não some da tabela).
 */
export const RADAR_NO_VERDICT = "none";

/** The verdicts that have a word in the dictionary; any other shows as it is. */
export const RADAR_VERDICTS = ["top_find", "shortlisted", "approved", "kept", "stretch", "eliminated", "not_verified"] as const;

/** Verdicts of the check of a description against its source (vocabulary 3, in pt-BR in the vault). */
export const VERIFICATION_VERDICTS = ["confirmado", "divergente", "inacessível", "expirada"] as const;

/* ── vínculo com o funil ──────────────────────────────────────────────────── */

export const JOB_LINK_KEYS = ["unlinked", "linked"] as const;
export type JobLinkFilter = (typeof JOB_LINK_KEYS)[number];

export function isJobLinkFilter(value: string): value is JobLinkFilter {
  return (JOB_LINK_KEYS as readonly string[]).includes(value);
}

/* ── modalidade e contrato (texto livre no schema, lista curada aqui) ─────── */

export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
export const EMPLOYMENT_TYPES = ["full_time", "contract", "b2b", "freelance"] as const;

/* ── board de origem ──────────────────────────────────────────────────────── */

/**
 * De onde a vaga veio, derivado do host de `sourceUrl`.
 *
 * Não existe coluna `board` no schema — e criar uma exigiria migration + escrita
 * pelo MCP. O host já carrega o dado com fidelidade suficiente para a triagem,
 * e derivar aqui mantém a tela honesta quando o vault muda de agregador.
 *
 * Retorna `null` para URL sintética (`demo://…`, o URI que o cutover criou para
 * linha de tracker sem link): não há board, e inventar um seria mentira.
 */
const BOARD_LABELS: [needle: string, label: string][] = [
  ["linkedin.", "LinkedIn"],
  ["indeed.", "Indeed"],
  ["glassdoor.", "Glassdoor"],
  ["vanhack.", "VanHack"],
  ["boards.greenhouse.io", "Greenhouse"],
  ["job-boards.greenhouse.io", "Greenhouse"],
  ["greenhouse.io", "Greenhouse"],
  ["jobs.lever.co", "Lever"],
  ["lever.co", "Lever"],
  ["bamboohr.com", "BambooHR"],
  ["workable.com", "Workable"],
  ["smartrecruiters.com", "SmartRecruiters"],
  ["ashbyhq.com", "Ashby"],
  ["myworkdayjobs.com", "Workday"],
  ["workday.com", "Workday"],
  ["recruitee.com", "Recruitee"],
  ["personio.de", "Personio"],
  ["join.com", "Join"],
  ["wellfound.com", "Wellfound"],
  ["angel.co", "Wellfound"],
  ["remoteok.com", "RemoteOK"],
  ["weworkremotely.com", "We Work Remotely"],
  ["otta.com", "Otta"],
  ["welcometothejungle.com", "Welcome to the Jungle"],
  ["stackoverflow.com", "Stack Overflow"],
  ["stepstone.de", "StepStone"],
  ["irishjobs.ie", "IrishJobs"],
];

export function jobBoard(sourceUrl: string): string | null {
  let host: string;
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    host = url.hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [needle, label] of BOARD_LABELS) {
    if (host.includes(needle)) return label;
  }
  // Sem agregador conhecido: o próprio domínio é a informação útil ("carreira
  // no site da empresa"), sem o `www.` que só ocupa espaço na coluna.
  return host.replace(/^www\./, "");
}

/**
 * Origem (`Application.source`) sugerida quando a candidatura nasce do radar.
 * Mantém os valores de `APPLICATION_SOURCES` — qualquer outro board vira
 * `radar`, que é literalmente de onde a linha veio.
 */
export function sourceFromBoard(sourceUrl: string): string {
  const board = jobBoard(sourceUrl);
  switch (board) {
    case "LinkedIn":
      return "linkedin";
    case "Indeed":
      return "indeed";
    case "Glassdoor":
      return "glassdoor";
    case "VanHack":
      return "vanhack";
    default:
      return "radar";
  }
}
