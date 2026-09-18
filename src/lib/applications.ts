/**
 * Vocabulario compartilhado do funil de candidaturas.
 *
 * Fonte da verdade: os enums NATIVOS do Postgres (`funnel_stage`,
 * `sponsorship_signal`) declarados em `prisma/schema.prisma`. Este arquivo so
 * traduz para pt-BR e agrupa — nao inventa valor nenhum. O `satisfies` em cada
 * lista faz o TypeScript quebrar o build se um valor sair do schema sem sair
 * daqui (e vice-versa).
 *
 * **O import de `@prisma/client` e `import type`** de proposito: este modulo e
 * importado por Client Components (toolbar, formulario, badges) e um import de
 * valor arrastaria o runtime do Prisma para o bundle do navegador. Tipo e
 * apagado na compilacao; nada do Prisma chega ao cliente.
 *
 * O tracker plano `JobApplication` (com `status` = not_applied|applied|replied|
 * interview|offer|rejected e `sponsorsVisa Boolean`) morreu no F2a — a
 * migration `20260816170000_application_cutover` converteu as linhas e dropou a
 * tabela. Se voce procurava `APPLICATION_STATUSES`, o equivalente e
 * `FUNNEL_STAGES`; se procurava `sponsorsVisa`, leia a secao "duas rotas".
 */

import type { FunnelStage, SponsorshipSignal } from "@prisma/client";

/* ── funil ────────────────────────────────────────────────────────────────
 *
 * A ordem desta lista e a ordem de declaracao do enum no Postgres, que e a
 * ordem do pipeline. Isso importa: `ORDER BY stage` no Postgres usa a ordem de
 * DECLARACAO do enum, nao a alfabetica — entao `orderBy: { stage: "asc" }`
 * ja devolve o funil na sequencia certa, sem `CASE` nem coluna auxiliar.
 */
export const FUNNEL_STAGES = [
  "radar",
  "shortlisted",
  "package_drafting",
  "package_ready",
  "awaiting_my_send",
  "ready",
  "applied",
  "recruiter_contact",
  "screening",
  "assessment",
  "technical_challenge",
  "interview",
  "final_interview",
  "reference_check",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
  "no_response",
  "ghosted",
  "skipped",
] as const satisfies readonly FunnelStage[];

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
  radar: "Radar",
  shortlisted: "Selecionada",
  package_drafting: "Pacote em redação",
  package_ready: "Pacote pronto",
  awaiting_my_send: "Aguardando meu envio",
  ready: "Pronta para enviar",
  applied: "Enviada",
  recruiter_contact: "Contato do recrutador",
  screening: "Triagem",
  assessment: "Avaliação",
  technical_challenge: "Desafio técnico",
  interview: "Entrevista",
  final_interview: "Entrevista final",
  reference_check: "Checagem de referências",
  offer: "Oferta",
  accepted: "Aceita",
  rejected: "Recusada",
  withdrawn: "Retirada",
  no_response: "Sem resposta",
  ghosted: "Ghosting",
  skipped: "Descartada",
};

/**
 * Fases do funil, para agrupar o `<Select>` e desenhar o Kanban sem 21 colunas.
 * `open: false` marca o grupo terminal (a candidatura nao anda mais).
 */
export const FUNNEL_STAGE_PHASES = [
  {
    key: "pre_send",
    label: "Pré-envio",
    open: true,
    stages: [
      "radar",
      "shortlisted",
      "package_drafting",
      "package_ready",
      "awaiting_my_send",
      "ready",
    ],
  },
  {
    key: "sent",
    label: "Enviada",
    open: true,
    stages: ["applied", "recruiter_contact", "screening"],
  },
  {
    key: "evaluation",
    label: "Avaliação",
    open: true,
    stages: [
      "assessment",
      "technical_challenge",
      "interview",
      "final_interview",
      "reference_check",
    ],
  },
  {
    key: "outcome",
    label: "Desfecho",
    open: false,
    stages: [
      "offer",
      "accepted",
      "rejected",
      "withdrawn",
      "no_response",
      "ghosted",
      "skipped",
    ],
  },
] as const satisfies readonly {
  key: string;
  label: string;
  open: boolean;
  stages: readonly FunnelStage[];
}[];

export type FunnelPhaseKey = (typeof FUNNEL_STAGE_PHASES)[number]["key"];

/** Estagios em que a candidatura ja saiu das minhas maos (metrica de envio). */
export const SENT_STAGES = [
  "applied",
  "recruiter_contact",
  "screening",
  "assessment",
  "technical_challenge",
  "interview",
  "final_interview",
  "reference_check",
  "offer",
  "accepted",
  "rejected",
  "no_response",
  "ghosted",
] as const satisfies readonly FunnelStage[];

/** Estagios de entrevista, para o card do dashboard. */
export const INTERVIEW_STAGES = [
  "interview",
  "final_interview",
] as const satisfies readonly FunnelStage[];

export function stageLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (FUNNEL_STAGE_LABELS as Record<string, string>)[value] ?? value;
}

export function isFunnelStage(value: string): value is FunnelStage {
  return (FUNNEL_STAGES as readonly string[]).includes(value);
}

/* ── duas rotas: patrocinio de visto NAO e um booleano ────────────────────
 *
 * O tracker antigo tinha `sponsorsVisa Boolean`, e isso era um erro de modelo,
 * nao so de granularidade: um unico eixo "precisa de patrocinio?" apaga a
 * distincao entre as DUAS rotas que o usuario persegue em paralelo —
 *
 *   1. ROTA REMOTA (foco atual): vaga remota pagando em moeda forte, contratada
 *      como contractor/B2B. O gate de visto simplesmente NAO SE APLICA
 *      (`not_applicable_b2b`); o que decide e a rota de contratacao.
 *   2. ROTA DE RELOCACAO (plano de fundo, CA -> IE -> DE): aqui o patrocinio e o
 *      criterio eliminatorio nº 1 — 6 das 15 vagas descartadas na varredura
 *      cairam por autorizacao/cidadania antes de qualquer leitura de CV.
 *
 * Um filtro unico "precisa de sponsorship" descartaria justamente as vagas que
 * sao o alvo de hoje. Por isso a UI expoe DOIS controles: `route` (qual das
 * duas rotas) e `sponsorship` (o sinal exato, dentro da rota).
 */

export const SPONSORSHIP_SIGNALS = [
  "not_applicable_b2b",
  "explicit_support",
  "newcomer_friendly",
  "silent",
  "requires_authorization",
  "country_residency_required",
  "explicit_no_sponsorship",
  "requires_citizenship",
] as const satisfies readonly SponsorshipSignal[];

export const SPONSORSHIP_LABELS: Record<SponsorshipSignal, string> = {
  not_applicable_b2b: "Não se aplica (B2B/contractor)",
  explicit_support: "Patrocina explicitamente",
  newcomer_friendly: "Amigável a recém-chegados",
  silent: "Não informa",
  requires_authorization: "Exige autorização prévia",
  country_residency_required: "Exige residência no país",
  explicit_no_sponsorship: "Não patrocina (explícito)",
  requires_citizenship: "Exige cidadania",
};

/** Descricao longa, para o `title`/tooltip do filtro. */
export const SPONSORSHIP_HINTS: Record<SponsorshipSignal, string> = {
  not_applicable_b2b:
    "Vaga remota contratada como contractor/B2B — o gate de visto não se aplica.",
  explicit_support: "A vaga declara que patrocina visto de trabalho.",
  newcomer_friendly:
    "Empresa que costuma contratar recém-chegados (sem promessa explícita de patrocínio).",
  silent: "A vaga não diz nada sobre patrocínio — precisa ser verificado.",
  requires_authorization:
    "Exige autorização de trabalho já existente no país. Eliminatório na rota de relocação.",
  country_residency_required:
    "Exige residência no país. Eliminatório na rota de relocação.",
  explicit_no_sponsorship:
    "A vaga afirma que não patrocina. Eliminatório na rota de relocação.",
  requires_citizenship:
    "Exige cidadania. Eliminatório na rota de relocação.",
};

export type SponsorshipRoute = "remote_b2b" | "relocation";

/**
 * A qual rota cada sinal pertence. `not_applicable_b2b` e o marcador da rota
 * remota; todo o resto so faz sentido quando existe mudanca de pais.
 */
export const SPONSORSHIP_ROUTES: Record<
  SponsorshipRoute,
  readonly SponsorshipSignal[]
> = {
  remote_b2b: ["not_applicable_b2b"],
  relocation: [
    "explicit_support",
    "newcomer_friendly",
    "silent",
    "requires_authorization",
    "country_residency_required",
    "explicit_no_sponsorship",
    "requires_citizenship",
  ],
};

export const SPONSORSHIP_ROUTE_LABELS: Record<SponsorshipRoute, string> = {
  remote_b2b: "Remota (B2B/contractor)",
  relocation: "Relocação",
};

export const SPONSORSHIP_ROUTE_HINTS: Record<SponsorshipRoute, string> = {
  remote_b2b:
    "Foco atual: remoto pagando em moeda forte, sem gate de visto.",
  relocation:
    "Plano de fundo (CA → IE → DE): aqui o patrocínio é eliminatório.",
};

export const SPONSORSHIP_ROUTE_KEYS = [
  "remote_b2b",
  "relocation",
] as const satisfies readonly SponsorshipRoute[];

/**
 * Semaforo do gate de visto. Alimenta a cor do badge e o aviso da lista.
 * `not_applicable` NAO e "bom" nem "ruim" — e outra rota.
 */
export type SponsorshipGate = "not_applicable" | "open" | "unknown" | "blocked";

export const SPONSORSHIP_GATES: Record<SponsorshipSignal, SponsorshipGate> = {
  not_applicable_b2b: "not_applicable",
  explicit_support: "open",
  newcomer_friendly: "open",
  silent: "unknown",
  requires_authorization: "blocked",
  country_residency_required: "blocked",
  explicit_no_sponsorship: "blocked",
  requires_citizenship: "blocked",
};

export function sponsorshipLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (SPONSORSHIP_LABELS as Record<string, string>)[value] ?? value;
}

export function isSponsorshipSignal(value: string): value is SponsorshipSignal {
  return (SPONSORSHIP_SIGNALS as readonly string[]).includes(value);
}

export function isSponsorshipRoute(value: string): value is SponsorshipRoute {
  return value === "remote_b2b" || value === "relocation";
}

export function routeOf(value: SponsorshipSignal): SponsorshipRoute {
  return value === "not_applicable_b2b" ? "remote_b2b" : "relocation";
}

/* ── origem do lead (texto livre no banco, lista curada aqui) ─────────────── */

export const APPLICATION_SOURCES = [
  "vanhack",
  "linkedin",
  "company_site",
  "indeed",
  "glassdoor",
  "recruiter",
  "referral",
  "radar",
  "other",
] as const;
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  vanhack: "VanHack",
  linkedin: "LinkedIn",
  company_site: "Site da empresa",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  recruiter: "Recrutador",
  referral: "Indicação",
  radar: "Radar de vagas",
  other: "Outra",
};

export function sourceLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (SOURCE_LABELS as Record<string, string>)[value] ?? value;
}

/* ── chave natural ────────────────────────────────────────────────────────── */

/**
 * Slug ASCII de uma parte da chave natural. **Precisa continuar equivalente ao
 * `__f2a_slug` da migration `20260816170000_application_cutover` e ao slug do
 * seed**: os tres produzem a chave que deduplica candidatura entre a migration,
 * o seed e o MCP. Divergir aqui recria o problema que o F2a resolveu.
 */
export function slugPart(input: string): string {
  const ascii = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // marcas de combinacao do NFD (acentos)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || "sem-nome";
}

/**
 * `folderName` = chave natural da candidatura (a pasta em `04 - Candidaturas`).
 * Quando o cargo esta em branco, o discriminador cai para o mercado e depois
 * para "vaga" — mesma regra da migration, para que "Datadog IE" e "Datadog DE"
 * nao colidam.
 */
export function buildFolderName(input: {
  company: string;
  roleTitle?: string | null;
  market?: string | null;
}): string {
  const discriminator =
    input.roleTitle?.trim() || input.market?.trim() || "vaga";
  return `${slugPart(input.company)}--${slugPart(discriminator)}`;
}
