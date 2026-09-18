import "server-only";
import type { Prisma } from "@prisma/client";
import { db, dbConfigured } from "@/lib/db";

/**
 * Carga do dossiê completo de UMA candidatura — a consulta que alimenta
 * `/admin/applications/[id]` inteira, abas incluídas.
 *
 * ── Por que uma consulta só ────────────────────────────────────────────────
 * A tela tem sete abas (documentos, timeline, cobertura, triagem, honestidade,
 * entrevistas, checklist). O caminho ingênuo — uma aba, um `page.tsx`, uma
 * consulta — vira N+1 disfarçado de arquitetura: sete round-trips para exibir
 * um registro, e o `<Tabs>` do Radix nem desmonta o conteúdo inativo, então
 * trocar de aba não economizaria nada. Aqui é UM `findUnique` com `select`
 * aninhado; o Prisma resolve as relações em lote, e cada `TabsContent` recebe
 * um array que já está na memória.
 *
 * ── Por que `select` explícito e não `include` ─────────────────────────────
 * `include: { documents: true }` traria `contentMd` de todo documento — o
 * markdown inteiro do CV e da carta, por candidatura, para desenhar uma tabela
 * de metadados. O mesmo vale para `Job.descriptionMd`/`requirementsMd`. As
 * colunas longas só entram onde a tela realmente as mostra.
 *
 * ── Ordenação ──────────────────────────────────────────────────────────────
 * Fixada aqui, não na tela: `events` em ordem CRONOLÓGICA ascendente (a
 * timeline se lê de cima para baixo, do mais antigo para o mais novo);
 * `checklistItems`, `screeningQuestions` e `requirementCoverages` por
 * `orderIndex`, que é a ordem do arquivo no vault e a chave de dedupe do MCP.
 */

const DOSSIER_SELECT = {
  id: true,
  folderName: true,
  stage: true,
  packageStatus: true,
  roleTitle: true,
  market: true,
  sponsorship: true,
  priority: true,
  source: true,
  fit: true,
  followUp: true,
  appliedAt: true,
  firstResponseAt: true,
  closedAt: true,
  outcomeReason: true,
  targetSalary: true,
  summaryMd: true,
  notesMd: true,
  visibility: true,
  sourcePath: true,
  lastSyncRunId: true,
  lastMcpTool: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,

  company: {
    select: {
      id: true,
      folderName: true,
      name: true,
      publicName: true,
      ndaProtected: true,
      website: true,
      careersUrl: true,
      linkedinUrl: true,
      country: true,
      city: true,
      market: true,
      industry: true,
      sizeBucket: true,
    },
  },
  job: {
    select: {
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
    },
  },
  resumeTemplate: { select: { id: true, key: true, name: true } },

  documents: {
    select: {
      id: true,
      filePath: true,
      kind: true,
      title: true,
      language: true,
      status: true,
      wordCount: true,
      sentAt: true,
      updatedAt: true,
      visibility: true,
    },
    orderBy: [{ kind: "asc" }, { filePath: "asc" }],
  },
  artifacts: {
    select: {
      id: true,
      path: true,
      kind: true,
      mimeType: true,
      sizeBytes: true,
      contentStored: true,
      generatedAt: true,
      document: { select: { id: true, title: true, filePath: true } },
    },
    orderBy: [{ kind: "asc" }, { path: "asc" }],
  },
  contacts: {
    select: {
      id: true,
      name: true,
      roleTitle: true,
      email: true,
      phone: true,
      linkedinUrl: true,
      channel: true,
      timezone: true,
      notesMd: true,
    },
    orderBy: { name: "asc" },
  },
  events: {
    select: {
      id: true,
      occurredAt: true,
      type: true,
      direction: true,
      fromStage: true,
      toStage: true,
      channel: true,
      subject: true,
      bodyMd: true,
      contact: { select: { id: true, name: true } },
      document: { select: { id: true, title: true, filePath: true } },
    },
    // Ordem cronológica: a timeline é lida de cima para baixo.
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  },
  interviews: {
    select: {
      id: true,
      round: true,
      kind: true,
      scheduledAt: true,
      durationMin: true,
      mode: true,
      timezone: true,
      interviewers: true,
      prepMd: true,
      notesMd: true,
      outcome: true,
      contact: { select: { id: true, name: true } },
    },
    orderBy: [{ round: "asc" }, { scheduledAt: "asc" }],
  },
  screeningQuestions: {
    select: {
      id: true,
      orderIndex: true,
      question: true,
      answer: true,
      language: true,
      required: true,
    },
    orderBy: { orderIndex: "asc" },
  },
  requirementCoverages: {
    select: {
      id: true,
      orderIndex: true,
      requirement: true,
      requirementKey: true,
      coverage: true,
      evidenceMd: true,
    },
    orderBy: { orderIndex: "asc" },
  },
  honestyNotes: {
    select: {
      id: true,
      ruleCode: true,
      scope: true,
      noteMd: true,
      severity: true,
      createdAt: true,
    },
    orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
  },
  checklistItems: {
    select: {
      id: true,
      orderIndex: true,
      label: true,
      groupLabel: true,
      done: true,
      doneAt: true,
    },
    orderBy: { orderIndex: "asc" },
  },
  verifications: {
    select: {
      id: true,
      sourceUrl: true,
      verifiedAt: true,
      verdict: true,
      method: true,
      checkedFields: true,
      discrepancyMd: true,
    },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.ApplicationSelect;

export type ApplicationDossier = Prisma.ApplicationGetPayload<{
  select: typeof DOSSIER_SELECT;
}>;

/**
 * Três desfechos distintos, porque a tela reage diferente a cada um:
 * `not_found` é 404 (`notFound()`), `unavailable` é o estado destrutivo (sem
 * `DATABASE_URL` ou consulta falhou) — e os dois NÃO podem virar o mesmo
 * "nenhum registro", que mentiria dizendo que a candidatura não existe.
 */
export type DossierResult =
  | { status: "ok"; application: ApplicationDossier }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function getApplicationDossier(
  id: string,
): Promise<DossierResult> {
  // A3: `next build` roda sem DATABASE_URL — degrade, nunca lance.
  if (!dbConfigured) return { status: "unavailable" };
  try {
    const application = await db.application.findUnique({
      where: { id },
      select: DOSSIER_SELECT,
    });
    return application
      ? { status: "ok", application }
      : { status: "not_found" };
  } catch (err) {
    console.error("[admin] load application dossier failed", err);
    return { status: "unavailable" };
  }
}
