import { ClosureReason, FunnelStage, InterviewStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import {
  CLOSURE_REASONS,
  CLOSURE_REASON_LABELS,
  FUNNEL_STAGES,
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  acceptsClosureReason,
  closureReasonLabel,
  closureReasonOnStageChange,
  closureReasonRemovedBy,
  closureReasonRemovedNote,
  closureReasonRestoredNote,
  interviewStatusLabel,
} from "@/lib/applications";

/** The site's languages, one per dictionary. */
const LOCALES = Object.keys({ en, "pt-BR": ptBR }) as ("en" | "pt-BR")[];

describe("vocabulary", () => {
  it("lists every value of the database enums, in their order", () => {
    expect([...CLOSURE_REASONS]).toEqual(Object.values(ClosureReason));
    expect([...INTERVIEW_STATUSES]).toEqual(Object.values(InterviewStatus));
  });

  it("is exactly the list of the spec", () => {
    expect(CLOSURE_REASONS.map((r) => closureReasonLabel(r, "pt-BR"))).toEqual([
      "Salário",
      "Visto",
      "Aderência técnica",
      "Senioridade",
      "Idioma",
      "Local",
      "Vaga fechada",
      "Candidato interno",
      "Desistência",
      "Não informado",
      "Outro",
    ]);
    expect(INTERVIEW_STATUSES.map((s) => interviewStatusLabel(s, "pt-BR"))).toEqual([
      "Prevista",
      "Marcada",
      "Realizada",
      "Cancelada",
    ]);
  });

  describe.each(LOCALES)("in %s", (locale) => {
    it.each(Object.values(ClosureReason))("closure reason %s has a label", (value) => {
      expect(CLOSURE_REASON_LABELS[value][locale].trim()).not.toBe("");
      expect(closureReasonLabel(value, locale)).toBe(CLOSURE_REASON_LABELS[value][locale]);
    });

    it.each(Object.values(InterviewStatus))("interview status %s has a label", (value) => {
      expect(INTERVIEW_STATUS_LABELS[value][locale].trim()).not.toBe("");
      expect(interviewStatusLabel(value, locale)).toBe(INTERVIEW_STATUS_LABELS[value][locale]);
    });

    it("no two values share a label", () => {
      const reasons = CLOSURE_REASONS.map((r) => closureReasonLabel(r, locale));
      const statuses = INTERVIEW_STATUSES.map((s) => interviewStatusLabel(s, locale));
      expect(new Set(reasons).size).toBe(reasons.length);
      expect(new Set(statuses).size).toBe(statuses.length);
    });
  });

  it("has no label in a language the site does not speak", () => {
    for (const labels of [
      ...Object.values(CLOSURE_REASON_LABELS),
      ...Object.values(INTERVIEW_STATUS_LABELS),
    ]) {
      expect(Object.keys(labels).sort()).toEqual([...LOCALES].sort());
    }
  });
});

describe("closure reason by stage", () => {
  it("exists only in rejected and withdrawn", () => {
    expect(Object.values(FunnelStage).filter(acceptsClosureReason)).toEqual([
      "rejected",
      "withdrawn",
    ]);
  });

  // Every transition of the funnel, 21 × 21, always with a reason recorded.
  const transitions = FUNNEL_STAGES.flatMap((from) => FUNNEL_STAGES.map((to) => ({ from, to })));

  it.each(transitions)("$from -> $to", ({ from, to }) => {
    // Only a stage that accepts a reason can be carrying one.
    const current = acceptsClosureReason(from) ? ClosureReason.visa : null;
    const change = closureReasonOnStageChange(to, current);

    const after =
      "closureReason" in change.patch ? change.patch.closureReason : current;
    if (to === "rejected" || to === "withdrawn") {
      expect(after).toBe(current);
      expect(change.removed).toBeNull();
    } else {
      expect(after).toBeNull();
      expect(change.removed).toBe(current);
    }
    // Nothing to remove, nothing to write: the update keeps its usual shape.
    if (!current) expect(change.patch).toEqual({});
  });

  it("tells the history which reason went away", () => {
    expect(closureReasonRemovedNote("visa")).toBe("Motivo de encerramento removido: Visto.");
    expect(closureReasonRemovedNote(null)).toBeNull();
  });

  it.each(CLOSURE_REASONS)("reads %s back from the note that removed it", (reason) => {
    expect(closureReasonRemovedBy(closureReasonRemovedNote(reason))).toBe(reason);
  });

  it("reads no reason from any other text", () => {
    for (const text of [null, undefined, "", "Motivo de encerramento removido: Visa.", "nota\n\nMotivo de encerramento removido: Visto."]) {
      expect(closureReasonRemovedBy(text)).toBeNull();
    }
    expect(closureReasonRemovedBy(closureReasonRestoredNote("visa"))).toBeNull();
  });

  it("tells the history which reason came back", () => {
    expect(closureReasonRestoredNote("salary")).toBe("Motivo de encerramento restaurado: Salário.");
  });
});
