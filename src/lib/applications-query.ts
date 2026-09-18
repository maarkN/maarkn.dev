import "server-only";
import type { FunnelStage, Prisma, SponsorshipSignal } from "@prisma/client";
import { db, dbConfigured } from "@/lib/db";
import {
  FUNNEL_STAGE_PHASES,
  SPONSORSHIP_ROUTES,
  isFunnelStage,
  isSponsorshipRoute,
  isSponsorshipSignal,
  type FunnelPhaseKey,
  type SponsorshipRoute,
} from "@/lib/applications";

/**
 * Leitura da lista de candidaturas: `searchParams` -> Prisma, com paginacao e
 * filtro **no banco**. Nenhum `.filter()` no cliente — o radar sozinho ja
 * passa de 190 vagas e a lista antiga filtrava em memoria.
 *
 * Este modulo e `server-only`. O vocabulario (rotulos, listas de enum) mora em
 * `@/lib/applications`, que e importavel pelo cliente. Nao mova nada daqui para
 * la: `Prisma` no bundle do navegador quebra o build.
 *
 * Duas decisoes que valem por todas as consultas daqui:
 *
 * 1. **`sponsorship` e `market` sao efetivos, nao literais.** `Application`
 *    sobrescreve a vaga quando tem sinal proprio; quando e nulo, vale
 *    `job.sponsorship`. Filtrar so pela coluna da candidatura esconderia todas
 *    as linhas que herdam da vaga — que sao a maioria depois do cutover.
 * 2. **O gate de visto tem DUAS rotas.** Ver o cabecalho de
 *    `@/lib/applications`: `route=remote_b2b` e `route=relocation` sao
 *    filtraveis separadamente, porque a rota remota (foco atual) e justamente
 *    a que um filtro binario "precisa de patrocinio?" jogaria fora.
 */

export const APPLICATIONS_PAGE_SIZE = 20;

/** Colunas que a lista precisa. `select` explicito: `notesMd`/`summaryMd` sao
 * markdown longo e nao aparecem na tabela. */
const LIST_SELECT = {
  id: true,
  folderName: true,
  stage: true,
  roleTitle: true,
  market: true,
  sponsorship: true,
  source: true,
  fit: true,
  priority: true,
  appliedAt: true,
  firstResponseAt: true,
  targetSalary: true,
  followUp: true,
  updatedAt: true,
  company: {
    select: { id: true, name: true, folderName: true, country: true, city: true },
  },
  job: {
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      market: true,
      sponsorship: true,
      locationText: true,
      workMode: true,
    },
  },
  _count: { select: { documents: true, events: true, interviews: true } },
} satisfies Prisma.ApplicationSelect;

export type ApplicationListRow = Prisma.ApplicationGetPayload<{
  select: typeof LIST_SELECT;
}>;

export type ApplicationFilters = {
  q: string;
  /** Estagio exato do funil (`funnel_stage`). */
  stage: string;
  /** Fase do funil (grupo de estagios) — alternativa a `stage`. */
  phase: string;
  /** Mercado alvo (CA, IE, DE, EU-remoto, BR-B2B...). Texto livre no banco. */
  market: string;
  /** `remote_b2b` | `relocation` — as duas rotas, filtraveis separadamente. */
  route: string;
  /** Sinal exato de patrocinio (`sponsorship_signal`). */
  sponsorship: string;
  source: string;
};

export const EMPTY_APPLICATION_FILTERS: ApplicationFilters = {
  q: "",
  stage: "",
  phase: "",
  market: "",
  route: "",
  sponsorship: "",
  source: "",
};

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Le os filtros da URL. Valor desconhecido e DESCARTADO, nunca repassado ao
 * Prisma — `?stage=' OR 1=1` some aqui, nao no driver. */
export function parseApplicationFilters(params: RawParams): ApplicationFilters {
  const stage = one(params.stage).trim();
  const phase = one(params.phase).trim();
  const route = one(params.route).trim();
  const sponsorship = one(params.sponsorship).trim();
  return {
    q: one(params.q).trim().slice(0, 120),
    stage: isFunnelStage(stage) ? stage : "",
    phase: isPhaseKey(phase) ? phase : "",
    market: one(params.market).trim().slice(0, 60),
    route: isSponsorshipRoute(route) ? route : "",
    sponsorship: isSponsorshipSignal(sponsorship) ? sponsorship : "",
    source: one(params.source).trim().slice(0, 40),
  };
}

export function parsePage(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(one(value), 10);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}

export function hasAnyApplicationFilter(filters: ApplicationFilters): boolean {
  return Object.values(filters).some(Boolean);
}

/** Chave do `<Suspense>`: muda sempre que a consulta muda, para o skeleton
 * reaparecer em vez de a tabela congelar com o resultado anterior. */
export function applicationsQueryKey(
  filters: ApplicationFilters,
  page: number,
): string {
  return [
    filters.q,
    filters.stage,
    filters.phase,
    filters.market,
    filters.route,
    filters.sponsorship,
    filters.source,
    page,
  ].join("|");
}

function isPhaseKey(value: string): value is FunnelPhaseKey {
  return FUNNEL_STAGE_PHASES.some((phase) => phase.key === value);
}

function stagesOfPhase(key: FunnelPhaseKey): readonly FunnelStage[] {
  return FUNNEL_STAGE_PHASES.find((phase) => phase.key === key)!.stages;
}

/**
 * `sponsorship` efetivo: o da candidatura quando existe, senao o da vaga.
 *
 * O `OR` do meio e o que torna o filtro honesto. O terceiro ramo cobre a
 * candidatura sem vaga vinculada: `Job.sponsorship` tem default `silent`, entao
 * "sem informacao" e a ausencia de qualquer um dos dois — e quem filtra por
 * `silent` espera ver essas linhas tambem.
 */
function effectiveSponsorshipWhere(
  values: readonly SponsorshipSignal[],
): Prisma.ApplicationWhereInput {
  const or: Prisma.ApplicationWhereInput[] = [
    { sponsorship: { in: [...values] } },
    { sponsorship: null, job: { sponsorship: { in: [...values] } } },
  ];
  if (values.includes("silent")) {
    or.push({ sponsorship: null, jobId: null });
  }
  return { OR: or };
}

export function buildApplicationWhere(
  filters: ApplicationFilters,
): Prisma.ApplicationWhereInput {
  const and: Prisma.ApplicationWhereInput[] = [];

  if (filters.stage) {
    and.push({ stage: filters.stage as FunnelStage });
  } else if (filters.phase) {
    and.push({ stage: { in: [...stagesOfPhase(filters.phase as FunnelPhaseKey)] } });
  }

  if (filters.source) and.push({ source: filters.source });

  if (filters.market) {
    // Mesmo padrao do sponsorship: a candidatura manda, a vaga completa.
    and.push({
      OR: [
        { market: filters.market },
        { market: null, job: { market: filters.market } },
      ],
    });
  }

  // Rota e sinal se acumulam: `route=relocation` + `sponsorship=silent` = "na
  // rota de relocacao, ainda nao verificadas".
  if (filters.sponsorship) {
    and.push(effectiveSponsorshipWhere([filters.sponsorship as SponsorshipSignal]));
  } else if (filters.route) {
    and.push(
      effectiveSponsorshipWhere(SPONSORSHIP_ROUTES[filters.route as SponsorshipRoute]),
    );
  }

  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    and.push({
      OR: [
        { folderName: contains },
        { roleTitle: contains },
        { company: { name: contains } },
        { company: { folderName: contains } },
        { job: { title: contains } },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export type ApplicationListResult = {
  rows: ApplicationListRow[];
  total: number;
  page: number;
  totalPages: number;
  /** `true` quando a consulta falhou ou nao ha banco: a tabela mostra o estado
   * destrutivo em vez de mentir "nenhum registro". */
  failed: boolean;
};

export async function listApplications(args: {
  filters: ApplicationFilters;
  page: number;
  pageSize?: number;
}): Promise<ApplicationListResult> {
  const pageSize = args.pageSize ?? APPLICATIONS_PAGE_SIZE;
  const empty: ApplicationListResult = {
    rows: [],
    total: 0,
    page: 1,
    totalPages: 1,
    failed: true,
  };
  // A3: `next build` roda sem DATABASE_URL — degrade, nunca lance.
  if (!dbConfigured) return empty;

  const where = buildApplicationWhere(args.filters);
  try {
    // Conta antes para grampear a pagina: `?page=99` numa lista de 2 paginas
    // devolveria uma tabela vazia sem explicacao.
    const total = await db.application.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, args.page), totalPages);
    const rows = await db.application.findMany({
      where,
      select: LIST_SELECT,
      // `stage` e enum NATIVO: o Postgres ordena pela ordem de DECLARACAO, que
      // e a ordem do funil. Nao ha `CASE` nem coluna auxiliar aqui.
      orderBy: [
        { stage: "asc" },
        { priority: { sort: "asc", nulls: "last" } },
        { updatedAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { rows, total, page, totalPages, failed: false };
  } catch (err) {
    console.error("[admin] list applications failed", err);
    return empty;
  }
}

/** Mercados distintos ja presentes na base, para o `<Select>` de filtro. */
export async function listApplicationMarkets(): Promise<string[]> {
  if (!dbConfigured) return [];
  try {
    const [fromApplications, fromJobs] = await Promise.all([
      db.application.findMany({
        where: { market: { not: null } },
        distinct: ["market"],
        select: { market: true },
      }),
      db.job.findMany({
        where: { market: { not: null }, applications: { some: {} } },
        distinct: ["market"],
        select: { market: true },
      }),
    ]);
    const markets = new Set<string>();
    for (const row of [...fromApplications, ...fromJobs]) {
      if (row.market) markets.add(row.market);
    }
    return [...markets].sort((a, b) => a.localeCompare(b, "pt-BR"));
  } catch (err) {
    console.error("[admin] list application markets failed", err);
    return [];
  }
}

/** Origens distintas (o campo e texto livre; a lista curada esta em
 * `APPLICATION_SOURCES`, mas o MCP pode gravar outra). */
export async function listApplicationSources(): Promise<string[]> {
  if (!dbConfigured) return [];
  try {
    const rows = await db.application.findMany({
      where: { source: { not: null } },
      distinct: ["source"],
      select: { source: true },
    });
    return rows
      .map((row) => row.source)
      .filter((source): source is string => Boolean(source))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  } catch (err) {
    console.error("[admin] list application sources failed", err);
    return [];
  }
}

/** Sponsorship efetivo de uma linha ja carregada (candidatura > vaga). */
export function effectiveSponsorship(
  row: Pick<ApplicationListRow, "sponsorship" | "job">,
): SponsorshipSignal | null {
  return row.sponsorship ?? row.job?.sponsorship ?? null;
}

/** Mercado efetivo de uma linha ja carregada (candidatura > vaga). */
export function effectiveMarket(
  row: Pick<ApplicationListRow, "market" | "job">,
): string | null {
  return row.market ?? row.job?.market ?? null;
}
