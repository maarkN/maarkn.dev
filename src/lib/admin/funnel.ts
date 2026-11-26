/**
 * How the funnel is drawn in the backoffice: the phase each stage belongs to,
 * which gives it its mark, and the six columns of the board (docs/design/
 * backoffice.md). The stages and the phases themselves are in
 * `@/lib/applications`; nothing here invents a value.
 *
 * Client-safe: `import type` from Prisma only.
 */

import type { FunnelStage } from "@prisma/client";
import { FUNNEL_STAGE_PHASES, type FunnelPhaseKey } from "@/lib/applications";

const PHASE_OF = Object.fromEntries(
  FUNNEL_STAGE_PHASES.flatMap((phase) => phase.stages.map((stage) => [stage, phase.key])),
) as Record<FunnelStage, FunnelPhaseKey>;

/** The phase of a stage: what its mark says. */
export function phaseOf(stage: FunnelStage): FunnelPhaseKey {
  return PHASE_OF[stage];
}

export type BoardColumnKey = "selected" | "ready" | "sent" | "talking" | "evaluation" | "offer";

/**
 * The six columns of the board, in the order of the funnel. Only the open
 * applications are on it: the outcomes that close one (accepted, rejected,
 * withdrawn, no response, ghosted, discarded) are not.
 *
 * `drop` is the stage an application takes when it is dropped on the column, or
 * moved to it with the arrows: the one that names the column. Moving between
 * two stages of the same column is the dossier's.
 */
export const BOARD_COLUMNS: readonly { key: BoardColumnKey; stages: readonly FunnelStage[]; drop: FunnelStage }[] = [
  { key: "selected", stages: ["radar", "shortlisted", "package_drafting"], drop: "shortlisted" },
  { key: "ready", stages: ["package_ready", "awaiting_my_send", "ready"], drop: "ready" },
  { key: "sent", stages: ["applied"], drop: "applied" },
  { key: "talking", stages: ["recruiter_contact", "screening"], drop: "recruiter_contact" },
  {
    key: "evaluation",
    stages: ["assessment", "technical_challenge", "interview", "final_interview", "reference_check"],
    drop: "interview",
  },
  { key: "offer", stages: ["offer"], drop: "offer" },
];

/** Every stage that is on the board. */
export const BOARD_STAGES: readonly FunnelStage[] = BOARD_COLUMNS.flatMap((column) => column.stages);

/** The column a stage is in; `null` for an outcome that closed the application. */
export function columnOf(stage: FunnelStage): BoardColumnKey | null {
  return BOARD_COLUMNS.find((column) => column.stages.includes(stage))?.key ?? null;
}

/** The column next to `key`, to the left (-1) or to the right (+1); `null` past the ends. */
export function neighbourColumn(key: BoardColumnKey, step: -1 | 1): BoardColumnKey | null {
  const index = BOARD_COLUMNS.findIndex((column) => column.key === key);
  return BOARD_COLUMNS[index + step]?.key ?? null;
}

export function dropStageOf(key: BoardColumnKey): FunnelStage {
  return BOARD_COLUMNS.find((column) => column.key === key)!.drop;
}
