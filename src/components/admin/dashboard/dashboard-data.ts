import "server-only";

import { cache } from "react";
import type { FunnelStage, Prisma } from "@prisma/client";
import {
  FUNNEL_STAGES,
  FUNNEL_STAGE_LABELS,
  FUNNEL_STAGE_PHASES,
  SENT_STAGES,
  type FunnelPhaseKey,
} from "@/lib/applications";
import {
  EMPTY_APPLICATION_FILTERS,
  buildApplicationWhere,
} from "@/lib/applications-query";
import { db, dbConfigured } from "@/lib/db";

/**
 * Leitura agregada do dashboard do funil (`/admin`).
 *
 * Regras que valem para o arquivo inteiro:
 *
 * 1. **Uma consulta agregada por número, nunca um N+1.** Cada loader dispara um
 *    único `Promise.all` de agregações (`groupBy`/`count`) e deriva no
 *    JavaScript tudo o que já está nas contagens — a ocupação de cada estágio
 *    sai de UM `groupBy`, não de 21 `count`. Não há `$queryRaw` aqui: tudo é
 *    expressável em Prisma, então não há string de SQL para parametrizar.
 * 2. **`cache()` do React** dedupa a leitura entre as seções da página: os
 *    cartões de número e o funil visual leem o mesmo `loadFunnelSnapshot()` e o
 *    banco é consultado uma vez por request, mesmo em `<Suspense>` separados.
 * 3. **A3 — `next build` roda sem `DATABASE_URL`.** Todo loader devolve um
 *    objeto vazio com `failed: true` em vez de lançar; a UI mostra o estado
 *    destrutivo em vez de mentir "nenhum registro".
 * 4. **Filtro de rota reusa `buildApplicationWhere`** (`@/lib/applications-query`),
 *    que já implementa a herança efetiva `candidatura > vaga` do sponsorship.
 *    Reimplementar aqui divergiria da lista.
 *
 * ── HONESTIDADE DO DADO ─────────────────────────────────────────────────────
 * O funil real ainda tem (quase) zero candidatura enviada. Um painel que
 * mostrasse "0%" de conversão estaria inventando um fato: 0% é uma medida,
 * ausência de denominador não é. Por isso `conversion` é `number | null` e o
 * `null` vira "—" na tela, com aviso explícito. Ver `buildFunnelView`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Início do dia UTC corrente. Fora do corpo de componente de propósito:
 * `Date.now()` dentro de um componente é sinalizado por `react-hooks/purity`.
 */
function startOfUtcDay(): Date {
  return new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS);
}

/* ── recortes do funil ───────────────────────────────────────────────────── */

/**
 * Desfechos em que a candidatura saiu do trilho sem chegar ao fim. Ficam FORA
 * do funil visual porque a ordem do enum os coloca depois de `accepted` — o que
 * é ordem de declaração, não progresso. Uma candidatura `rejected` não avançou
 * mais que uma `offer`.
 */
export const CLOSED_LOST_STAGES = [
  "rejected",
  "withdrawn",
  "no_response",
  "ghosted",
  "skipped",
] as const satisfies readonly FunnelStage[];

/** O trilho linear (radar → aceita), na ordem de declaração do enum. */
export const PIPELINE_STAGES: FunnelStage[] = FUNNEL_STAGES.filter(
  (stage) => !(CLOSED_LOST_STAGES as readonly FunnelStage[]).includes(stage),
);

/** Pacote pronto e a bola ainda comigo: o que dá para enviar hoje. */
const READY_TO_SEND_STAGES = [
  "package_ready",
  "awaiting_my_send",
  "ready",
] as const satisfies readonly FunnelStage[];

const PHASE_BY_STAGE = new Map<
  FunnelStage,
  (typeof FUNNEL_STAGE_PHASES)[number]
>();
for (const phase of FUNNEL_STAGE_PHASES) {
  for (const stage of phase.stages) PHASE_BY_STAGE.set(stage, phase);
}

function emptyStageCounts(): Record<FunnelStage, number> {
  return Object.fromEntries(FUNNEL_STAGES.map((stage) => [stage, 0])) as Record<
    FunnelStage,
    number
  >;
}

function sumStages(
  counts: Record<FunnelStage, number>,
  stages: readonly FunnelStage[],
): number {
  return stages.reduce((total, stage) => total + (counts[stage] ?? 0), 0);
}

/* ── snapshot do funil ───────────────────────────────────────────────────── */

export type FunnelSnapshot = {
  /** `true` = banco ausente ou consulta falhou. A UI mostra o estado de erro. */
  failed: boolean;
  total: number;
  /** Ocupação atual de cada estágio (de um único `groupBy`). */
  byStage: Record<FunnelStage, number>;
  /** Candidaturas que já saíram das minhas mãos (`SENT_STAGES`). */
  sent: number;
  /** Pacote pronto e ainda não enviado. */
  readyToSend: number;
  /** Enviadas sem nenhuma resposta registrada. */
  awaitingReply: number;
  /** Rota remota B2B (sponsorship efetivo `not_applicable_b2b`). */
  routeRemote: number;
  /** Rota de relocação (os outros 7 sinais). */
  routeRelocation: number;
  /** Entrevistas com data marcada e desfecho ainda em aberto. */
  interviewsOpen: number;
  /** Próxima entrevista em aberto a partir de hoje (null = nenhuma futura). */
  nextInterviewAt: Date | null;
  /** Vagas mantidas/selecionadas no radar que ainda não viraram candidatura. */
  radarUntriaged: number;
  radarTotal: number;
  /** Encerradas que comprovadamente receberam resposta (`firstResponseAt`). */
  lostAfterReply: number;
  /** Encerradas comprovadamente enviadas, mas sem resposta (`appliedAt`). */
  lostAfterSend: number;
  /** Encerradas sem prova de envio: só contam no topo do funil. */
  lostBeforeSend: number;
};

function emptySnapshot(): FunnelSnapshot {
  return {
    failed: true,
    total: 0,
    byStage: emptyStageCounts(),
    sent: 0,
    readyToSend: 0,
    awaitingReply: 0,
    routeRemote: 0,
    routeRelocation: 0,
    interviewsOpen: 0,
    nextInterviewAt: null,
    radarUntriaged: 0,
    radarTotal: 0,
    lostAfterReply: 0,
    lostAfterSend: 0,
    lostBeforeSend: 0,
  };
}

/**
 * Uma rodada de agregações. Dez consultas de contagem, nenhuma por linha.
 *
 * `radarUntriaged` = hit de radar que sobreviveu à varredura (`kept` ou
 * `shortlisted`) e ainda não tem candidatura: ou não foi vinculado a uma vaga,
 * ou a vaga não tem candidatura nenhuma. É a fila de triagem real.
 */
export const loadFunnelSnapshot = cache(async (): Promise<FunnelSnapshot> => {
  if (!dbConfigured) return emptySnapshot();

  const today = startOfUtcDay();
  // Entrevista "em aberto": tem data marcada e o desfecho ainda não foi
  // registrado (`outcome` é texto livre — nulo ou "pending").
  const openInterview: Prisma.InterviewWhereInput = {
    scheduledAt: { not: null },
    OR: [{ outcome: null }, { outcome: "pending" }],
  };

  try {
    const [
      grouped,
      awaitingReply,
      routeRemote,
      routeRelocation,
      interviewsOpen,
      nextInterview,
      radarUntriaged,
      radarTotal,
      lostAfterReply,
      lostAfterSend,
    ] = await Promise.all([
      db.application.groupBy({ by: ["stage"], _count: { _all: true } }),
      db.application.count({ where: { stage: "applied", firstResponseAt: null } }),
      db.application.count({
        where: buildApplicationWhere({
          ...EMPTY_APPLICATION_FILTERS,
          route: "remote_b2b",
        }),
      }),
      db.application.count({
        where: buildApplicationWhere({
          ...EMPTY_APPLICATION_FILTERS,
          route: "relocation",
        }),
      }),
      db.interview.count({ where: openInterview }),
      db.interview.findFirst({
        where: { ...openInterview, scheduledAt: { gte: today } },
        orderBy: { scheduledAt: "asc" },
        select: { scheduledAt: true },
      }),
      db.radarHit.count({
        where: {
          verdict: { in: ["kept", "shortlisted"] },
          OR: [{ jobId: null }, { job: { applications: { none: {} } } }],
        },
      }),
      db.radarHit.count(),
      db.application.count({
        where: {
          stage: { in: [...CLOSED_LOST_STAGES] },
          firstResponseAt: { not: null },
        },
      }),
      db.application.count({
        where: {
          stage: { in: [...CLOSED_LOST_STAGES] },
          firstResponseAt: null,
          appliedAt: { not: null },
        },
      }),
    ]);

    const byStage = emptyStageCounts();
    for (const row of grouped) byStage[row.stage] = row._count._all;

    const totalLost = sumStages(byStage, CLOSED_LOST_STAGES);

    return {
      failed: false,
      total: sumStages(byStage, FUNNEL_STAGES),
      byStage,
      sent: sumStages(byStage, SENT_STAGES),
      readyToSend: sumStages(byStage, READY_TO_SEND_STAGES),
      awaitingReply,
      routeRemote,
      routeRelocation,
      interviewsOpen,
      nextInterviewAt: nextInterview?.scheduledAt ?? null,
      radarUntriaged,
      radarTotal,
      lostAfterReply,
      lostAfterSend,
      // O resto das encerradas não tem prova de envio: só o topo do funil.
      lostBeforeSend: Math.max(0, totalLost - lostAfterReply - lostAfterSend),
    };
  } catch (err) {
    console.error("[admin] dashboard funnel snapshot failed", err);
    return emptySnapshot();
  }
});

/* ── funil visual + conversão ────────────────────────────────────────────── */

export type FunnelRow = {
  stage: FunnelStage;
  label: string;
  phaseKey: FunnelPhaseKey;
  phaseLabel: string;
  /** Primeira linha da fase: a tabela desenha o cabeçalho do grupo. */
  phaseStart: boolean;
  /** Ocupação atual — quantas candidaturas PARARAM aqui. */
  current: number;
  /** Quantas comprovadamente chegaram pelo menos até aqui. */
  reached: number;
  /** Fração 0–1 sobre o estágio anterior. `null` = denominador zero. */
  conversion: number | null;
  /** Largura da barra (0–100), proporcional ao topo do funil. */
  share: number;
};

export type FunnelView = {
  rows: FunnelRow[];
  /** Desfechos fora do trilho, com contagem — nunca escondidos. */
  closed: { stage: FunnelStage; label: string; count: number }[];
  total: number;
  /** Quantas taxas ficaram indefinidas (denominador zero). */
  undefinedRates: number;
  /** Chegaram a "Enviada". Zero = nenhum dado de conversão pós-envio existe. */
  sentReached: number;
};

/**
 * Transforma o snapshot no funil visual. **Puro** — nada de banco aqui.
 *
 * ── Como "alcançaram" é calculado ───────────────────────────────────────────
 * A ocupação por estágio responde "onde a candidatura está", não "até onde ela
 * chegou": quem está em `interview` não aparece mais em `applied`. Uma taxa de
 * conversão sobre ocupação seria simplesmente errada. Então:
 *
 *   alcançaram(i) = Σ ocupação(j) para todo j ≥ i no trilho linear
 *                 + encerradas cujo AVANÇO ESTÁ PROVADO POR COLUNA:
 *                     · `firstResponseAt` != null → chegou a "Contato do recrutador"
 *                     · senão `appliedAt` != null → chegou a "Enviada"
 *                     · senão                     → só conta no topo ("Radar")
 *
 * Nada é inferido: uma candidatura `skipped` sem `appliedAt` não é creditada
 * como se tivesse sido enviada, e uma `rejected` com `firstResponseAt` não é
 * jogada fora do denominador. Quando a base tiver histórico de
 * `ApplicationEvent` suficiente, esta função pode passar a usar o maior
 * `toStage` registrado — a forma da conta não muda.
 *
 * `conversion` é `null` quando o estágio anterior tem alcance zero. `null` vira
 * "—" na tela, jamais "0%": 0% afirmaria que houve tentativa e nenhuma passou.
 */
export function buildFunnelView(snapshot: FunnelSnapshot): FunnelView {
  const repliedIndex = PIPELINE_STAGES.indexOf("recruiter_contact");
  const sentIndex = PIPELINE_STAGES.indexOf("applied");

  // Soma sufixo: alcance por ordem do trilho, num único passe de trás para frente.
  const suffix = new Array<number>(PIPELINE_STAGES.length);
  let running = 0;
  for (let i = PIPELINE_STAGES.length - 1; i >= 0; i -= 1) {
    running += snapshot.byStage[PIPELINE_STAGES[i]] ?? 0;
    suffix[i] = running;
  }

  const reached = PIPELINE_STAGES.map((_stage, i) => {
    let value = suffix[i];
    // As três parcelas são conjuntos disjuntos — não há dupla contagem.
    if (i <= repliedIndex) value += snapshot.lostAfterReply;
    if (i <= sentIndex) value += snapshot.lostAfterSend;
    if (i === 0) value += snapshot.lostBeforeSend;
    return value;
  });

  const top = reached[0] ?? 0;
  let undefinedRates = 0;
  let lastPhase: FunnelPhaseKey | null = null;

  const rows: FunnelRow[] = PIPELINE_STAGES.map((stage, i) => {
    const previous = i === 0 ? null : reached[i - 1];
    const conversion =
      previous === null || previous === 0 ? null : reached[i] / previous;
    if (i > 0 && conversion === null) undefinedRates += 1;

    const phase = PHASE_BY_STAGE.get(stage)!;
    const phaseStart = phase.key !== lastPhase;
    lastPhase = phase.key;

    return {
      stage,
      label: FUNNEL_STAGE_LABELS[stage],
      phaseKey: phase.key,
      phaseLabel: phase.label,
      phaseStart,
      current: snapshot.byStage[stage] ?? 0,
      reached: reached[i],
      conversion,
      share: top > 0 ? (reached[i] / top) * 100 : 0,
    };
  });

  return {
    rows,
    closed: CLOSED_LOST_STAGES.map((stage) => ({
      stage,
      label: FUNNEL_STAGE_LABELS[stage],
      count: snapshot.byStage[stage] ?? 0,
    })),
    total: snapshot.total,
    undefinedRates,
    sentReached: reached[sentIndex] ?? 0,
  };
}

/* ── próximos passos ─────────────────────────────────────────────────────── */

/**
 * Rótulos pt-BR de `Interview.kind` (texto livre no banco — a lista é curada,
 * o valor cru aparece quando o MCP gravar algo fora dela).
 */
const INTERVIEW_KIND_LABELS: Record<string, string> = {
  screening: "Triagem",
  technical: "Entrevista técnica",
  system_design: "System design",
  culture: "Cultural",
  behavioral: "Comportamental",
  final: "Entrevista final",
  hr: "RH",
  panel: "Painel",
};

export type NextStepItem = {
  key: string;
  kind: "interview" | "follow_up";
  applicationId: string;
  /** Empresa (ou `folderName` quando a candidatura não tem empresa ligada). */
  company: string;
  role: string | null;
  stage: FunnelStage;
  /** O que precisa acontecer, em uma linha. */
  detail: string;
  /** Data marcada. Só entrevista tem — `followUp` é texto livre (ver abaixo). */
  at: Date | null;
  /** Entrevista com data no passado e desfecho ainda em aberto. */
  overdue: boolean;
};

export type NextStepsResult = {
  items: NextStepItem[];
  /** Follow-ups em candidatura ainda viva (a lista mostra só os primeiros). */
  followUpTotal: number;
  failed: boolean;
};

/**
 * "Próximos passos" = entrevistas marcadas e ainda em aberto + candidaturas com
 * lembrete de follow-up. Só candidatura **viva**: um follow-up numa recusada ou
 * numa que levou ghosting não é um próximo passo, é histórico.
 *
 * **`Application` não tem `nextStep`/`nextStepDue`.** O schema tem `followUp`,
 * que é TEXTO LIVRE de propósito (metade das linhas do tracker do vault é
 * "cobrar em 2 semanas", não uma data). Logo não existe "vencendo" para o
 * follow-up: o que dá para ordenar honestamente é a entrevista, que tem
 * `scheduledAt`. O follow-up entra abaixo, com o texto que o vault escreveu.
 * Três consultas agregadas, com o join da empresa — nenhuma por linha.
 */
export const loadNextSteps = cache(
  async (limit = 8): Promise<NextStepsResult> => {
    const empty: NextStepsResult = { items: [], followUpTotal: 0, failed: true };
    if (!dbConfigured) return empty;

    const today = startOfUtcDay();
    const stillOpen: Prisma.ApplicationWhereInput = {
      stage: { notIn: [...CLOSED_LOST_STAGES] },
    };

    try {
      const [interviews, followUps, followUpTotal] = await Promise.all([
        db.interview.findMany({
          where: {
            scheduledAt: { not: null },
            OR: [{ outcome: null }, { outcome: "pending" }],
            application: stillOpen,
          },
          orderBy: { scheduledAt: "asc" },
          take: limit,
          select: {
            id: true,
            kind: true,
            mode: true,
            scheduledAt: true,
            application: {
              select: {
                id: true,
                folderName: true,
                roleTitle: true,
                stage: true,
                company: { select: { name: true } },
              },
            },
          },
        }),
        db.application.findMany({
          where: { ...stillOpen, followUp: { not: null } },
          // A mais antiga primeiro: é a que está esperando resposta há mais
          // tempo. Sem `appliedAt` a candidatura ainda não saiu — vai para o fim.
          orderBy: [{ appliedAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
          take: limit,
          select: {
            id: true,
            folderName: true,
            roleTitle: true,
            stage: true,
            followUp: true,
            company: { select: { name: true } },
          },
        }),
        db.application.count({
          where: { ...stillOpen, followUp: { not: null } },
        }),
      ]);

      const items: NextStepItem[] = [
        ...interviews.map((row) => ({
          key: `interview:${row.id}`,
          kind: "interview" as const,
          applicationId: row.application.id,
          company: row.application.company?.name ?? row.application.folderName,
          role: row.application.roleTitle,
          stage: row.application.stage,
          detail: [
            INTERVIEW_KIND_LABELS[row.kind] ?? row.kind,
            row.mode ?? undefined,
          ]
            .filter(Boolean)
            .join(" · "),
          at: row.scheduledAt,
          overdue: Boolean(row.scheduledAt && row.scheduledAt < today),
        })),
        ...followUps.map((row) => ({
          key: `follow_up:${row.id}`,
          kind: "follow_up" as const,
          applicationId: row.id,
          company: row.company?.name ?? row.folderName,
          role: row.roleTitle,
          stage: row.stage,
          detail: row.followUp ?? "",
          at: null,
          overdue: false,
        })),
      ];

      return { items: items.slice(0, limit), followUpTotal, failed: false };
    } catch (err) {
      console.error("[admin] dashboard next steps failed", err);
      return empty;
    }
  },
);

/* ── últimos eventos ─────────────────────────────────────────────────────── */

/** Rótulos pt-BR de `ApplicationEvent.type` (texto livre, lista curada). */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  stage_change: "Mudança de estágio",
  email_sent: "E-mail enviado",
  reply_received: "Resposta recebida",
  interview_scheduled: "Entrevista agendada",
  package_ready: "Pacote pronto",
  follow_up: "Follow-up",
  note: "Nota",
};

export type RecentEvent = {
  id: string;
  occurredAt: Date;
  type: string;
  direction: "inbound" | "outbound" | null;
  channel: string | null;
  subject: string | null;
  fromStage: FunnelStage | null;
  toStage: FunnelStage | null;
  applicationId: string;
  company: string;
  role: string | null;
};

export type RecentEventsResult = { rows: RecentEvent[]; failed: boolean };

/** Uma consulta, com o join da candidatura e da empresa. */
export const loadRecentEvents = cache(
  async (limit = 8): Promise<RecentEventsResult> => {
    if (!dbConfigured) return { rows: [], failed: true };
    try {
      const rows = await db.applicationEvent.findMany({
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: limit,
        select: {
          id: true,
          occurredAt: true,
          type: true,
          direction: true,
          channel: true,
          subject: true,
          fromStage: true,
          toStage: true,
          application: {
            select: {
              id: true,
              folderName: true,
              roleTitle: true,
              company: { select: { name: true } },
            },
          },
        },
      });

      return {
        failed: false,
        rows: rows.map((row) => ({
          id: row.id,
          occurredAt: row.occurredAt,
          type: row.type,
          direction: row.direction,
          channel: row.channel,
          subject: row.subject,
          fromStage: row.fromStage,
          toStage: row.toStage,
          applicationId: row.application.id,
          company: row.application.company?.name ?? row.application.folderName,
          role: row.application.roleTitle,
        })),
      };
    } catch (err) {
      console.error("[admin] dashboard recent events failed", err);
      return { rows: [], failed: true };
    }
  },
);

/* ── resto do backoffice (inclui o RAG/base de conhecimento) ─────────────── */

export type PlatformStats = {
  failed: boolean;
  projects: number;
  featuredProjects: number;
  generations: number;
  lastGenerationAt: Date | null;
  chatTurns: number;
  chatTurnsToday: number;
  /** RAG: `KnowledgeChunk` indexado e quantas fontes distintas. */
  knowledgeChunks: number;
  knowledgeSources: number;
};

/**
 * Números do resto do backoffice. A leitura do RAG (`KnowledgeChunk`) vem daqui
 * e é preservada do dashboard anterior de propósito: é o único lugar da UI que
 * mostra se a base de conhecimento foi ingerida.
 */
export const loadPlatformStats = cache(async (): Promise<PlatformStats> => {
  const empty: PlatformStats = {
    failed: true,
    projects: 0,
    featuredProjects: 0,
    generations: 0,
    lastGenerationAt: null,
    chatTurns: 0,
    chatTurnsToday: 0,
    knowledgeChunks: 0,
    knowledgeSources: 0,
  };
  if (!dbConfigured) return empty;

  const today = startOfUtcDay();
  try {
    const [
      projects,
      featuredProjects,
      generations,
      lastGeneration,
      chatTurns,
      chatTurnsToday,
      knowledgeChunks,
      knowledgeSources,
    ] = await Promise.all([
      db.project.count(),
      db.project.count({ where: { featured: true } }),
      db.generation.count(),
      db.generation.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.chatLog.count(),
      db.chatLog.count({ where: { createdAt: { gte: today } } }),
      db.knowledgeChunk.count(),
      db.knowledgeChunk.groupBy({ by: ["source"] }).then((g) => g.length),
    ]);

    return {
      failed: false,
      projects,
      featuredProjects,
      generations,
      lastGenerationAt: lastGeneration?.createdAt ?? null,
      chatTurns,
      chatTurnsToday,
      knowledgeChunks,
      knowledgeSources,
    };
  } catch (err) {
    console.error("[admin] dashboard platform stats failed", err);
    return empty;
  }
});
