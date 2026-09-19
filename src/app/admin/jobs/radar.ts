/**
 * Vocabulário do RADAR de vagas — a camada que o `/admin/jobs` mostra por cima
 * de `Job`.
 *
 * Este módulo é importável pelo CLIENTE (a toolbar usa os rótulos) e por isso
 * não toca no Prisma nem em `@/lib/db`. O `import type { StatusStyles }` é
 * apagado na compilação.
 *
 * ── Por que os vereditos NÃO são um enum ──────────────────────────────────
 * `RadarHit.verdict` e `DescriptionVerification.verdict` são `String` no
 * schema, de propósito: são dois vocabulários paralelos que vêm do vault e
 * ainda não foram inventariados (o comentário do `schema.prisma` registra isso
 * em `DescriptionVerification`). O que existe hoje na base é
 * `kept | eliminated | shortlisted` no radar e `confirmado | divergente |
 * inacessível | expirada` na verificação — mas a varredura real usa outros
 * rótulos (`top_find`, `approved`, `stretch`).
 *
 * A consequência de projeto: o mapa abaixo é uma TRADUÇÃO, não uma validação.
 * Um veredito desconhecido nunca some da tela nem quebra o filtro — o
 * `StatusBadge` cai no `variant="outline"` com a chave crua, e as opções do
 * `<Select>` são lidas do banco (`listRadarVerdicts`), não desta lista.
 */

import type { StatusStyles } from "@/components/admin/status-badge";

/**
 * Sentinela do filtro "vaga sem veredito de radar" (o Radix proíbe `value=""`).
 * Colide com um veredito que se chamasse literalmente `none` — improvável o
 * bastante para não pagar o preço de um parâmetro de URL a mais, e a colisão
 * seria visível na hora (a opção some da lista, não some da tabela).
 */
export const RADAR_NO_VERDICT = "none";

export const RADAR_VERDICT_LABELS: Record<string, string> = {
  top_find: "Achado top",
  shortlisted: "Selecionada",
  approved: "Aprovada",
  kept: "Mantida",
  stretch: "Stretch",
  eliminated: "Eliminada",
  not_verified: "Não verificada",
};

/**
 * A cor codifica a DECISÃO, não o rótulo: verde = entra no funil, âmbar =
 * fica em observação, vermelho = caiu numa regra eliminatória.
 */
export const RADAR_VERDICT_STYLES: StatusStyles = {
  top_find: {
    label: RADAR_VERDICT_LABELS.top_find,
    className: "bg-emerald-500/15 text-emerald-300",
  },
  shortlisted: {
    label: RADAR_VERDICT_LABELS.shortlisted,
    className: "bg-emerald-500/15 text-emerald-300",
  },
  approved: {
    label: RADAR_VERDICT_LABELS.approved,
    className: "bg-emerald-500/15 text-emerald-300",
  },
  kept: {
    label: RADAR_VERDICT_LABELS.kept,
    className: "bg-amber-500/15 text-amber-300",
  },
  stretch: {
    label: RADAR_VERDICT_LABELS.stretch,
    className: "bg-amber-500/15 text-amber-300",
  },
  eliminated: {
    label: RADAR_VERDICT_LABELS.eliminated,
    className: "bg-red-500/15 text-red-300",
  },
  not_verified: {
    label: RADAR_VERDICT_LABELS.not_verified,
    className: "bg-slate-500/15 text-slate-300",
  },
};

export function radarVerdictLabel(value: string | null | undefined): string {
  if (!value) return "sem veredito";
  return RADAR_VERDICT_LABELS[value] ?? value;
}

/* ── verificação de descrição (vocabulário 3, em pt-BR no vault) ──────────── */

export const VERIFICATION_VERDICT_STYLES: StatusStyles = {
  confirmado: {
    label: "Confirmada",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  divergente: {
    label: "Divergente",
    className: "bg-amber-500/15 text-amber-300",
  },
  inacessível: {
    label: "Inacessível",
    className: "bg-slate-500/15 text-slate-300",
  },
  expirada: {
    label: "Expirada",
    className: "bg-red-500/15 text-red-300",
  },
};

/* ── vínculo com o funil ──────────────────────────────────────────────────── */

/**
 * A pergunta de triagem do radar: "o que ainda não virou candidatura?".
 * `unlinked` é o filtro que transforma esta tela numa fila de trabalho.
 */
export const JOB_LINK_KEYS = ["unlinked", "linked"] as const;
export type JobLinkFilter = (typeof JOB_LINK_KEYS)[number];

export const JOB_LINK_LABELS: Record<JobLinkFilter, string> = {
  unlinked: "Sem candidatura",
  linked: "Com candidatura",
};

export const JOB_LINK_HINTS: Record<JobLinkFilter, string> = {
  unlinked: "Vagas do radar que ainda não entraram no funil — a fila de trabalho.",
  linked: "Vagas que já têm candidatura aberta.",
};

export function isJobLinkFilter(value: string): value is JobLinkFilter {
  return (JOB_LINK_KEYS as readonly string[]).includes(value);
}

/* ── modalidade e contrato (texto livre no schema, lista curada aqui) ─────── */

const WORK_MODE_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  onsite: "Presencial",
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "CLT/full-time",
  contract: "Contrato",
  b2b: "B2B",
  freelance: "Freelance",
};

export function workModeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return WORK_MODE_LABELS[value] ?? value;
}

export function employmentTypeLabel(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return EMPLOYMENT_TYPE_LABELS[value] ?? value;
}

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
