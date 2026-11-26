/**
 * A stage of the funnel, recognised by its name and by the mark of its phase
 * (spec admin-listing): four shapes, so that telling the phases apart never
 * depends on the colour alone. Server-safe; the words come by prop, from the
 * dictionary (`admin.vocab`).
 */

import type { FunnelStage } from "@prisma/client";
import type { AdminDictionary } from "@/i18n/config";
import type { FunnelPhaseKey } from "@/lib/applications";
import { phaseOf } from "@/lib/admin/funnel";
import { cn } from "@/lib/utils";

/** The colour of a phase, a second channel beside the shape. */
const PHASE_TONE: Record<FunnelPhaseKey, string> = {
  pre_send: "text-ink-2",
  sent: "text-beam-2",
  evaluation: "text-warn",
  outcome: "text-ok",
};

/** Outcomes that are not a success keep the shape of their phase and lose its colour. */
const LOST: ReadonlySet<FunnelStage> = new Set(["rejected", "withdrawn", "no_response", "ghosted", "skipped"]);

function toneOf(stage: FunnelStage, phase: FunnelPhaseKey): string {
  if (stage === "rejected") return "text-destructive";
  return LOST.has(stage) ? "text-ink-3" : PHASE_TONE[phase];
}

/**
 * Before sending, an empty diamond; sent, a full one; in evaluation, a diamond
 * inside another; an outcome, a square.
 */
export function PhaseMark({ phase, className }: { phase: FunnelPhaseKey; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false" data-phase={phase} className={cn("size-3 shrink-0", className)}>
      {phase === "pre_send" && <path d="M6 1.2 10.8 6 6 10.8 1.2 6Z" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {phase === "sent" && <path d="M6 .8 11.2 6 6 11.2.8 6Z" fill="currentColor" />}
      {phase === "evaluation" && (
        <>
          <path d="M6 1.2 10.8 6 6 10.8 1.2 6Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6 3.9 8.1 6 6 8.1 3.9 6Z" fill="currentColor" />
        </>
      )}
      {phase === "outcome" && <rect x="1.5" y="1.5" width="9" height="9" fill="currentColor" />}
    </svg>
  );
}

export type StageWords = Pick<AdminDictionary["vocab"], "stage" | "phase">;

/** The name of the stage, in the language of the interface, after the mark of its phase. */
export function StageLabel({
  stage,
  words,
  className,
}: {
  stage: FunnelStage;
  words: StageWords;
  className?: string;
}) {
  const phase = phaseOf(stage);
  return (
    <span
      data-stage={stage}
      title={words.phase[phase]}
      className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}
    >
      <PhaseMark phase={phase} className={toneOf(stage, phase)} />
      <span>{words.stage[stage]}</span>
    </span>
  );
}
