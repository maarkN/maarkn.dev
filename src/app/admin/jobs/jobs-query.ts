import "server-only";
import type { Prisma, SponsorshipSignal } from "@prisma/client";
import { db, dbConfigured } from "@/lib/db";
import {
  SPONSORSHIP_ROUTES,
  isSponsorshipRoute,
  isSponsorshipSignal,
  type SponsorshipRoute,
} from "@/lib/applications";
import { RADAR_NO_VERDICT, isJobLinkFilter } from "./radar";

/**
 * Leitura do RADAR (`/admin/jobs`): `searchParams` -> Prisma, com filtro e
 * paginação **no banco**. Módulo `server-only`; o vocabulário que a toolbar
 * precisa mora em `./radar.ts`, que é importável pelo cliente.
 *
 * ── Por que a linha é `Job`, e não `RadarHit` ─────────────────────────────
 * `RadarHit` é o registro de uma varredura (uma linha do arquivo de radar);
 * `Job` é a vaga, com `sourceUrl` como chave natural — é o que o MCP escreve
 * (`upsert_job`), é o que a candidatura referencia (`Application.jobId`) e é o
 * que sobrevive entre varreduras. Listar hits duplicaria a mesma vaga a cada
 * nova varredura e daria uma linha sem destino para a ação "criar candidatura".
 * O hit entra como ENRIQUECIMENTO: pontuação, veredito e motivo de eliminação
 * vêm do hit mais recente daquela vaga.
 *
 * ── Por que não dá para reusar `buildApplicationWhere` ────────────────────
 * Aquele builder devolve `Prisma.ApplicationWhereInput`, e esta consulta tem
 * `Job` na raiz. O que É reusado é o vocabulário (`SPONSORSHIP_ROUTES`), para
 * que o botão "Remota (B2B)" signifique exatamente a mesma coisa nas duas telas.
 * Em `Job`, `sponsorship` é NOT NULL (default `silent`), então aqui não existe a
 * herança candidatura -> vaga: o filtro é direto na coluna.
 */

export const JOBS_PAGE_SIZE = 20;

const LIST_SELECT = {
  id: true,
  sourceUrl: true,
  title: true,
  seniority: true,
  market: true,
  locationText: true,
  workMode: true,
  employmentType: true,
  salaryText: true,
  sponsorship: true,
  postedAt: true,
  active: true,
  priority: true,
  fitScore: true,
  updatedAt: true,
  company: {
    select: { id: true, name: true, folderName: true, country: true, city: true },
  },
  // Hit mais recente: é ele que carrega pontuação/veredito/motivo. `take: 1`
  // impede que uma vaga vista em 5 varreduras traga 5 linhas para a memória.
  radarHits: {
    select: {
      id: true,
      score: true,
      rank: true,
      verdict: true,
      eliminationReason: true,
      companyName: true,
      createdAt: true,
      radarScan: { select: { scanKey: true, scannedAt: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 1,
  },
  verifications: {
    select: {
      id: true,
      verdict: true,
      verifiedAt: true,
      method: true,
      discrepancyMd: true,
    },
    orderBy: [
      { verifiedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 1,
  },
  applications: {
    select: { id: true, folderName: true, stage: true },
    orderBy: [{ updatedAt: "desc" }],
    take: 1,
  },
  _count: { select: { applications: true, radarHits: true, verifications: true } },
} satisfies Prisma.JobSelect;

export type JobListRow = Prisma.JobGetPayload<{ select: typeof LIST_SELECT }>;

export type JobFilters = {
  q: string;
  /** Veredito do radar, ou a sentinela `none` = vaga sem veredito. */
  verdict: string;
  market: string;
  /** `remote_b2b` | `relocation` — as duas rotas de `@/lib/applications`. */
  route: string;
  sponsorship: string;
  /** Faixa de pontuação, 0–100. String porque vem crua da URL. */
  scoreMin: string;
  scoreMax: string;
  /** `unlinked` | `linked` — já virou candidatura? */
  link: string;
};

export const EMPTY_JOB_FILTERS: JobFilters = {
  q: "",
  verdict: "",
  market: "",
  route: "",
  sponsorship: "",
  scoreMin: "",
  scoreMax: "",
  link: "",
};

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Veredito é texto livre no schema (ver o cabeçalho de `./radar.ts`), então não
 * há enum para validar contra. O que dá para garantir — e é o que importa — é
 * que o valor seja um slug curto: `?verdict=' OR 1=1` some aqui, e o Prisma
 * ainda parametriza o resto.
 */
const VERDICT_RE = /^[a-z0-9_-]{1,40}$/i;

function parseScore(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(0, parsed));
}

export function parseJobFilters(params: RawParams): JobFilters {
  const verdict = one(params.verdict).trim();
  const route = one(params.route).trim();
  const sponsorship = one(params.sponsorship).trim();
  const link = one(params.link).trim();
  const scoreMin = parseScore(one(params.scoreMin));
  const scoreMax = parseScore(one(params.scoreMax));
  return {
    q: one(params.q).trim().slice(0, 120),
    verdict: VERDICT_RE.test(verdict) ? verdict : "",
    market: one(params.market).trim().slice(0, 60),
    route: isSponsorshipRoute(route) ? route : "",
    sponsorship: isSponsorshipSignal(sponsorship) ? sponsorship : "",
    scoreMin: scoreMin === null ? "" : String(scoreMin),
    scoreMax: scoreMax === null ? "" : String(scoreMax),
    link: isJobLinkFilter(link) ? link : "",
  };
}

export function parseJobsPage(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(one(value), 10);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}

export function hasAnyJobFilter(filters: JobFilters): boolean {
  return Object.values(filters).some(Boolean);
}

/** Chave do `<Suspense>`: muda junto com a consulta, para o skeleton reaparecer
 * em vez de a tabela congelar com o resultado anterior. */
export function jobsQueryKey(filters: JobFilters, page: number): string {
  return [
    filters.q,
    filters.verdict,
    filters.market,
    filters.route,
    filters.sponsorship,
    filters.scoreMin,
    filters.scoreMax,
    filters.link,
    page,
  ].join("|");
}

export function buildJobWhere(filters: JobFilters): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [];

  if (filters.market) and.push({ market: filters.market });

  // Sinal exato manda sobre a rota (a rota é o conjunto que o contém).
  if (filters.sponsorship) {
    and.push({ sponsorship: filters.sponsorship as SponsorshipSignal });
  } else if (filters.route) {
    and.push({
      sponsorship: {
        in: [...SPONSORSHIP_ROUTES[filters.route as SponsorshipRoute]],
      },
    });
  }

  if (filters.verdict === RADAR_NO_VERDICT) {
    // "Sem veredito" = nenhuma varredura julgou esta vaga. Cobre tanto a vaga
    // sem hit nenhum quanto o hit gravado com `verdict` nulo.
    and.push({ radarHits: { none: { verdict: { not: null } } } });
  } else if (filters.verdict) {
    and.push({ radarHits: { some: { verdict: filters.verdict } } });
  }

  const min = filters.scoreMin ? Number(filters.scoreMin) : null;
  const max = filters.scoreMax ? Number(filters.scoreMax) : null;
  if (min !== null || max !== null) {
    const range = {
      ...(min !== null ? { gte: min } : {}),
      ...(max !== null ? { lte: max } : {}),
    };
    // Pontuação EFETIVA (mesmo padrão do sponsorship em `applications-query`):
    // `Job.fitScore` quando existe, senão a pontuação do radar. Filtrar só por
    // `fitScore` esconderia toda vaga que só foi pontuada na varredura.
    and.push({
      OR: [{ fitScore: range }, { fitScore: null, radarHits: { some: { score: range } } }],
    });
  }

  if (filters.link === "unlinked") and.push({ applications: { none: {} } });
  if (filters.link === "linked") and.push({ applications: { some: {} } });

  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    and.push({
      OR: [
        { title: contains },
        { sourceUrl: contains },
        { locationText: contains },
        { company: { name: contains } },
        { company: { folderName: contains } },
        { radarHits: { some: { companyName: contains } } },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export type JobListResult = {
  rows: JobListRow[];
  total: number;
  page: number;
  totalPages: number;
  /** `true` quando a consulta falhou ou não há banco: a tabela mostra o estado
   * destrutivo em vez de mentir "nenhum registro". */
  failed: boolean;
};

export async function listJobs(args: {
  filters: JobFilters;
  page: number;
  pageSize?: number;
}): Promise<JobListResult> {
  const pageSize = args.pageSize ?? JOBS_PAGE_SIZE;
  const empty: JobListResult = {
    rows: [],
    total: 0,
    page: 1,
    totalPages: 1,
    failed: true,
  };
  // A3: `next build` roda sem DATABASE_URL — degrade, nunca lance.
  if (!dbConfigured) return empty;

  const where = buildJobWhere(args.filters);
  try {
    // Conta antes para grampear a página: `?page=99` numa lista de 3 páginas
    // devolveria uma tabela vazia sem explicação.
    const total = await db.job.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, args.page), totalPages);
    const rows = await db.job.findMany({
      where,
      select: LIST_SELECT,
      // "Ordenação por pontuação desc". `fitScore` é a pontuação canônica da
      // vaga; o Prisma não sabe ordenar por escalar de relação `to-many`, então
      // a pontuação do radar não pode entrar aqui — na prática ela acompanha o
      // `fitScore` (quem tem hit pontuado tem fitScore), e quem não tem nenhuma
      // das duas cai no fim com `nulls: "last"`, que é onde deve ficar.
      orderBy: [
        { fitScore: { sort: "desc", nulls: "last" } },
        { priority: { sort: "asc", nulls: "last" } },
        { postedAt: { sort: "desc", nulls: "last" } },
        { updatedAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { rows, total, page, totalPages, failed: false };
  } catch (err) {
    console.error("[admin] list jobs failed", err);
    return empty;
  }
}

/** Mercados distintos já presentes em `Job`, para o `<Select>` de filtro. */
export async function listJobMarkets(): Promise<string[]> {
  if (!dbConfigured) return [];
  try {
    const rows = await db.job.findMany({
      where: { market: { not: null } },
      distinct: ["market"],
      select: { market: true },
    });
    return rows
      .map((row) => row.market)
      .filter((market): market is string => Boolean(market))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  } catch (err) {
    console.error("[admin] list job markets failed", err);
    return [];
  }
}

/**
 * Vereditos distintos já gravados. As opções do filtro saem do BANCO, não de
 * uma lista fixa: o vocabulário é livre (ver `./radar.ts`) e uma lista fixa
 * esconderia justamente o rótulo novo que a varredura acabou de introduzir.
 */
export async function listRadarVerdicts(): Promise<string[]> {
  if (!dbConfigured) return [];
  try {
    const rows = await db.radarHit.findMany({
      where: { verdict: { not: null } },
      distinct: ["verdict"],
      select: { verdict: true },
    });
    return rows
      .map((row) => row.verdict)
      .filter((verdict): verdict is string => Boolean(verdict))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  } catch (err) {
    console.error("[admin] list radar verdicts failed", err);
    return [];
  }
}

/**
 * Linhas de varredura que nunca viraram vaga (`RadarHit.jobId IS NULL`).
 *
 * Elas NÃO aparecem nesta tela, e isso é uma limitação real, não um descuido: a
 * linha da lista é `Job` (ver o cabeçalho), e um hit sem vaga não tem
 * `sourceUrl` canônico, mercado nem sponsorship próprios o bastante para virar
 * uma linha honesta — e muito menos para a ação de promover, que precisa de uma
 * vaga para vincular. Hoje nenhuma tool de MCP escreve `RadarHit`; quem escreve
 * é o seed de demonstração. Quando a varredura real entrar, ela passa por
 * `upsert_job` e as vagas aparecem aqui.
 *
 * A contagem existe para a tela DIZER isso, em vez de deixar o usuário
 * concluir sozinho que o radar tem menos linhas do que tem.
 */
export async function countUnmappedRadarHits(): Promise<number> {
  if (!dbConfigured) return 0;
  try {
    return await db.radarHit.count({ where: { jobId: null } });
  } catch (err) {
    console.error("[admin] count unmapped radar hits failed", err);
    return 0;
  }
}

/** Hit mais recente já carregado (o `take: 1` do select). */
export function latestHit(row: JobListRow): JobListRow["radarHits"][number] | null {
  return row.radarHits[0] ?? null;
}

/** Verificação de descrição mais recente já carregada. */
export function latestVerification(
  row: JobListRow,
): JobListRow["verifications"][number] | null {
  return row.verifications[0] ?? null;
}

/** Candidatura vinculada (a mais recente), quando a vaga já entrou no funil. */
export function linkedApplication(
  row: JobListRow,
): JobListRow["applications"][number] | null {
  return row.applications[0] ?? null;
}

/** Pontuação efetiva: a da vaga quando existe, senão a da varredura. */
export function effectiveScore(row: JobListRow): number | null {
  return row.fitScore ?? latestHit(row)?.score ?? null;
}

/**
 * Nome de empresa efetivo: a entidade `Company` quando a vaga já foi associada,
 * senão o texto cru que a varredura registrou. Nunca inventa.
 */
export function effectiveCompanyName(row: JobListRow): string | null {
  return row.company?.name ?? latestHit(row)?.companyName ?? null;
}
