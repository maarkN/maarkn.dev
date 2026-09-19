/**
 * Badges e rótulos que só existem DENTRO do dossiê de uma candidatura.
 *
 * Por que não em `@/components/admin/status-badge.tsx`: aquele arquivo é o
 * vocabulário das LISTAS (`FunnelStageBadge`, `SponsorshipBadge`,
 * `ApplicationSourceBadge`), usado por várias telas. Os enums daqui —
 * `CoverageLevel`, `DocKind`, severidade de `HonestyNote`, desfecho de
 * `Interview`, tipo de `ApplicationEvent` — aparecem em uma tela só. Ficam
 * juntos do consumidor e reaproveitam `makeStatusBadge`, então o contrato de
 * cor (`bg-<hue>-500/15 text-<hue>-<tom claro>`) continua um só.
 *
 * Três dos cinco vocabulários são **texto livre no banco** (status do
 * documento, tipo do evento, desfecho da entrevista, veredito da verificação):
 * o vault escreve o que quer e o MCP repassa. Por isso o fallback do
 * `StatusBadge` — `<Badge variant="outline">` com a chave crua — não é um caso
 * de erro aqui, é o caminho normal para um valor que ainda não foi catalogado.
 */

import type { CoverageLevel, DocKind } from "@prisma/client";
import {
  makeStatusBadge,
  type StatusStyles,
} from "@/components/admin/status-badge";

/* ── RequirementCoverage.coverage (`coverage_level`) ──────────────────────── */

/**
 * Os símbolos das matrizes do vault: ✅forte · ✅ · ⚠️ · ❌ · ⭐.
 * A escala é de EVIDÊNCIA, não de qualidade — `advantage` (⭐) não é "melhor
 * que forte", é um diferencial que a vaga nem pediu. Por isso sai da rampa
 * verde→vermelha e ganha cor própria.
 */
export const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  strong: "Forte",
  has: "Atende",
  shallow: "Superficial",
  gap: "Lacuna",
  advantage: "Diferencial",
};

const COVERAGE_CLASSNAMES: Record<CoverageLevel, string> = {
  strong: "bg-emerald-500/15 text-emerald-300",
  has: "bg-teal-500/15 text-teal-300",
  shallow: "bg-amber-500/15 text-amber-300",
  gap: "bg-red-500/15 text-red-300",
  advantage: "bg-violet-500/15 text-violet-300",
};

// `Record<CoverageLevel, …>` nos dois mapas: acrescentar um nível ao enum do
// Postgres sem passar por aqui quebra o build, que é o efeito desejado.
export const COVERAGE_STYLES: StatusStyles = Object.fromEntries(
  (Object.keys(COVERAGE_LABELS) as CoverageLevel[]).map((level) => [
    level,
    { label: COVERAGE_LABELS[level], className: COVERAGE_CLASSNAMES[level] },
  ]),
);

export const CoverageBadge = makeStatusBadge(COVERAGE_STYLES, "Coverage");

/* ── Document.kind (`doc_kind`) ───────────────────────────────────────────── */

export const DOC_KIND_LABELS: Record<DocKind, string> = {
  cv: "CV",
  cover_letter: "Carta de apresentação",
  job_data: "Dados da vaga",
  job_info: "Informações da vaga",
  notes: "Notas",
  email: "E-mail",
  screening_answers: "Respostas de triagem",
  recruiter_reply: "Resposta do recrutador",
  challenge_prep: "Preparação do desafio",
  practice: "Prática",
  english_eval_script: "Roteiro de avaliação de inglês",
  mini_spec: "Mini-spec",
};

/** A cor agrupa por PAPEL no pacote (peça enviada · insumo da vaga · preparo),
 *  não um matiz por tipo: doze cores numa coluna estreita seriam ruído. */
const DOC_KIND_CLASSNAMES: Record<DocKind, string> = {
  cv: "bg-blue-500/15 text-blue-300",
  cover_letter: "bg-indigo-500/15 text-indigo-300",
  job_data: "bg-slate-500/15 text-slate-300",
  job_info: "bg-slate-500/15 text-slate-300",
  notes: "bg-neutral-500/15 text-neutral-300",
  email: "bg-cyan-500/15 text-cyan-300",
  screening_answers: "bg-teal-500/15 text-teal-300",
  recruiter_reply: "bg-cyan-500/15 text-cyan-300",
  challenge_prep: "bg-violet-500/15 text-violet-300",
  practice: "bg-violet-500/15 text-violet-300",
  english_eval_script:
    "bg-fuchsia-500/15 text-fuchsia-300",
  mini_spec: "bg-amber-500/15 text-amber-300",
};

export const DOC_KIND_STYLES: StatusStyles = Object.fromEntries(
  (Object.keys(DOC_KIND_LABELS) as DocKind[]).map((kind) => [
    kind,
    { label: DOC_KIND_LABELS[kind], className: DOC_KIND_CLASSNAMES[kind] },
  ]),
);

export const DocKindBadge = makeStatusBadge(DOC_KIND_STYLES, "DocKind");

/* ── Document.status — texto livre (3º vocabulário do F1) ─────────────────── */

export const DOC_STATUS_STYLES: StatusStyles = {
  draft: {
    label: "Rascunho",
    className: "bg-amber-500/15 text-amber-300",
  },
  ready: {
    label: "Pronto",
    className: "bg-blue-500/15 text-blue-300",
  },
  final: {
    label: "Final",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  sent: {
    label: "Enviado",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  pending: {
    label: "Pendente",
    className: "bg-slate-500/15 text-slate-300",
  },
  archived: {
    label: "Arquivado",
    className: "bg-neutral-500/15 text-neutral-300",
  },
};

export const DocStatusBadge = makeStatusBadge(DOC_STATUS_STYLES, "DocStatus");

/* ── HonestyNote.severity — blocking | warning | info ─────────────────────── */

/**
 * `blocking` é o default do schema porque essas linhas são as regras de
 * enquadramento (R1–R8) que o gerador de CV precisa OBEDECER. Vermelho não é
 * alarme decorativo: é o que impede um CV de sair com uma afirmação que o vault
 * marcou como insustentável.
 */
export const HONESTY_SEVERITY_STYLES: StatusStyles = {
  blocking: {
    label: "Bloqueante",
    className: "bg-red-500/15 text-red-300",
  },
  warning: {
    label: "Atenção",
    className: "bg-amber-500/15 text-amber-300",
  },
  info: {
    label: "Informativo",
    className: "bg-slate-500/15 text-slate-300",
  },
};

export const HonestySeverityBadge = makeStatusBadge(
  HONESTY_SEVERITY_STYLES,
  "HonestySeverity",
);

/* ── Interview.outcome — texto livre ──────────────────────────────────────── */

export const INTERVIEW_OUTCOME_STYLES: StatusStyles = {
  passed: {
    label: "Aprovado",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  failed: {
    label: "Reprovado",
    className: "bg-red-500/15 text-red-300",
  },
  pending: {
    label: "Pendente",
    className: "bg-amber-500/15 text-amber-300",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-neutral-500/15 text-neutral-300",
  },
};

export const InterviewOutcomeBadge = makeStatusBadge(
  INTERVIEW_OUTCOME_STYLES,
  "InterviewOutcome",
);

export const INTERVIEW_KIND_LABELS: Record<string, string> = {
  screening: "Triagem",
  technical: "Técnica",
  system_design: "System design",
  culture: "Cultural",
  final: "Final",
  hiring_manager: "Gestor",
  behavioral: "Comportamental",
};

export function interviewKindLabel(value: string): string {
  return INTERVIEW_KIND_LABELS[value] ?? value;
}

/* ── ApplicationEvent.type — texto livre ──────────────────────────────────── */

export const EVENT_TYPE_LABELS: Record<string, string> = {
  stage_change: "Mudança de estágio",
  email_sent: "E-mail enviado",
  email_received: "E-mail recebido",
  reply_received: "Resposta recebida",
  application_sent: "Candidatura enviada",
  interview_scheduled: "Entrevista agendada",
  package_ready: "Pacote pronto",
  follow_up: "Follow-up",
  call: "Ligação",
  rejection_received: "Recusa recebida",
  offer_received: "Oferta recebida",
  note: "Nota",
  other: "Outro",
};

export function eventTypeLabel(value: string): string {
  return EVENT_TYPE_LABELS[value] ?? value;
}

/** Tipos oferecidos no dialog de "registrar evento".
 *  `stage_change` NÃO está aqui de propósito: esse evento é escrito pela ação
 *  de mover o estágio, com `fromStage`/`toStage` preenchidos. Deixar o operador
 *  criar um à mão produziria uma transição sem origem nem destino. */
export const LOGGABLE_EVENT_TYPES = [
  "note",
  "email_sent",
  "email_received",
  "reply_received",
  "application_sent",
  "interview_scheduled",
  "package_ready",
  "follow_up",
  "call",
  "rejection_received",
  "offer_received",
  "other",
] as const;

export const EVENT_DIRECTION_LABELS: Record<string, string> = {
  inbound: "Recebido",
  outbound: "Enviado",
};

export const EVENT_CHANNELS = [
  "email",
  "linkedin",
  "phone",
  "portal",
  "whatsapp",
  "other",
] as const;

export const EVENT_CHANNEL_LABELS: Record<string, string> = {
  email: "E-mail",
  linkedin: "LinkedIn",
  phone: "Telefone",
  portal: "Portal da vaga",
  whatsapp: "WhatsApp",
  other: "Outro",
};

export function eventChannelLabel(value: string): string {
  return EVENT_CHANNEL_LABELS[value] ?? value;
}

/* ── DescriptionVerification.verdict — texto livre ────────────────────────── */

export const VERIFICATION_STYLES: StatusStyles = {
  confirmado: {
    label: "Confirmada",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  divergente: {
    label: "Divergente",
    className: "bg-red-500/15 text-red-300",
  },
  inacessivel: {
    label: "Inacessível",
    className: "bg-amber-500/15 text-amber-300",
  },
  expirada: {
    label: "Expirada",
    className: "bg-neutral-500/15 text-neutral-300",
  },
};

export const VerificationBadge = makeStatusBadge(
  VERIFICATION_STYLES,
  "Verification",
);
