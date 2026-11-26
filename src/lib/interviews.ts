import type { InterviewStatus } from "@prisma/client";
import { interviewStatusLabel } from "@/lib/applications";

/**
 * The one rule that ties an interview's situation to its date: scheduled and
 * completed have one, planned does not, cancelled may. The database holds the
 * same rule (CHECK `Interview_status_date`); this is where it becomes a
 * decision and a message.
 *
 * Pure on purpose: the MCP tool uses it today, the backoffice screens and the
 * calendar will.
 */

export type InterviewState = {
  status: InterviewStatus;
  scheduledAt: Date | null;
};

export type InterviewStateChange = {
  /** Omitted: the situation follows the date. */
  status?: InterviewStatus;
  /** Omitted: the date stays. `null`: the date is removed. */
  scheduledAt?: Date | null;
};

export type InterviewStateResult =
  | ({ ok: true } & InterviewState)
  | { ok: false; message: string };

/** Situations that only exist with a date. */
const NEEDS_DATE: ReadonlySet<InterviewStatus> = new Set<InterviewStatus>([
  "scheduled",
  "completed",
]);

function missingDate(status: InterviewStatus): InterviewStateResult {
  return {
    ok: false,
    message: `Falta a data: uma entrevista ${interviewStatusLabel(status).toLowerCase()} precisa de data e hora.`,
  };
}

/**
 * Where the interview ends up. `current` is `null` when it does not exist yet.
 *
 * Without an explicit situation the date decides between planned and scheduled,
 * which is how a planned interview becomes scheduled and a scheduled one goes
 * back to planned. It never decides anything else: a completed interview that
 * would lose its date is refused, and a cancelled one stays cancelled.
 */
export function resolveInterviewState(
  current: InterviewState | null,
  change: InterviewStateChange,
): InterviewStateResult {
  const scheduledAt =
    change.scheduledAt === undefined
      ? (current?.scheduledAt ?? null)
      : change.scheduledAt;

  const status = change.status ?? impliedStatus(current, scheduledAt);

  if (NEEDS_DATE.has(status) && !scheduledAt) return missingDate(status);
  if (status === "planned" && scheduledAt) {
    return {
      ok: false,
      message:
        "Uma entrevista prevista não tem data. Para voltar a prevista, remova a data na mesma alteração.",
    };
  }
  return { ok: true, status, scheduledAt };
}

function impliedStatus(
  current: InterviewState | null,
  scheduledAt: Date | null,
): InterviewStatus {
  if (current?.status === "completed" || current?.status === "cancelled") {
    return current.status;
  }
  return scheduledAt ? "scheduled" : "planned";
}
