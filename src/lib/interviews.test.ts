import { InterviewStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  resolveInterviewState,
  type InterviewState,
  type InterviewStateChange,
} from "@/lib/interviews";

const D1 = new Date("2026-12-01T17:30:00.000Z");
const D2 = new Date("2026-12-08T17:30:00.000Z");

const planned: InterviewState = { status: "planned", scheduledAt: null };
const scheduled: InterviewState = { status: "scheduled", scheduledAt: D1 };
const completed: InterviewState = { status: "completed", scheduledAt: D1 };
const cancelled: InterviewState = { status: "cancelled", scheduledAt: D1 };
const cancelledUndated: InterviewState = { status: "cancelled", scheduledAt: null };

const STATES = [
  ["new", null],
  ["planned", planned],
  ["scheduled", scheduled],
  ["completed", completed],
  ["cancelled", cancelled],
  ["cancelled without a date", cancelledUndated],
] as const;

const DATES = [
  ["date omitted", undefined],
  ["date removed", null],
  ["date given", D2],
] as const;

const STATUSES = [undefined, ...Object.values(InterviewStatus)];

/** What the spec allows, written apart from the implementation. */
function coherent(state: InterviewState): boolean {
  if (state.status === "planned") return state.scheduledAt === null;
  if (state.status === "cancelled") return true;
  return state.scheduledAt !== null;
}

const combinations = STATES.flatMap(([from, current]) =>
  STATUSES.flatMap((status) =>
    DATES.map(([date, scheduledAt]) => ({ from, current, status, date, scheduledAt })),
  ),
);

describe("every combination of situation and date", () => {
  it.each(combinations)("$from, status $status, $date", ({ current, status, scheduledAt }) => {
    const change: InterviewStateChange = {
      ...(status ? { status } : {}),
      ...(scheduledAt === undefined ? {} : { scheduledAt }),
    };
    const date = scheduledAt === undefined ? (current?.scheduledAt ?? null) : scheduledAt;
    const result = resolveInterviewState(current, change);

    if (result.ok) {
      expect(coherent(result)).toBe(true);
      // What was asked for is what comes out: never another date or situation.
      expect(result.scheduledAt).toBe(date);
      if (status) expect(result.status).toBe(status);
    } else {
      // Refused only when what was asked for (or what was kept) is incoherent.
      const wanted = status ?? current?.status;
      expect(wanted).toBeDefined();
      expect(coherent({ status: wanted!, scheduledAt: date })).toBe(false);
    }
  });

  // The table, spelled out: what each combination becomes. "!" is refused.
  it.each([
    // status omitted: the date decides between planned and scheduled, and nothing else
    [null, undefined, undefined, "planned"],
    [null, undefined, null, "planned"],
    [null, undefined, D2, "scheduled"],
    [planned, undefined, undefined, "planned"],
    [planned, undefined, null, "planned"],
    [planned, undefined, D2, "scheduled"],
    [scheduled, undefined, undefined, "scheduled"],
    [scheduled, undefined, null, "planned"],
    [scheduled, undefined, D2, "scheduled"],
    [completed, undefined, undefined, "completed"],
    [completed, undefined, null, "!"],
    [completed, undefined, D2, "completed"],
    [cancelled, undefined, undefined, "cancelled"],
    [cancelled, undefined, null, "cancelled"],
    [cancelledUndated, undefined, D2, "cancelled"],
    // planned: never with a date
    [null, "planned", undefined, "planned"],
    [null, "planned", D2, "!"],
    [planned, "planned", D2, "!"],
    [scheduled, "planned", undefined, "!"],
    [scheduled, "planned", null, "planned"],
    [completed, "planned", null, "planned"],
    [cancelled, "planned", undefined, "!"],
    [cancelledUndated, "planned", undefined, "planned"],
    // scheduled: only with a date
    [null, "scheduled", undefined, "!"],
    [null, "scheduled", null, "!"],
    [null, "scheduled", D2, "scheduled"],
    [planned, "scheduled", undefined, "!"],
    [planned, "scheduled", D2, "scheduled"],
    [scheduled, "scheduled", undefined, "scheduled"],
    [scheduled, "scheduled", null, "!"],
    [completed, "scheduled", undefined, "scheduled"],
    [cancelled, "scheduled", undefined, "scheduled"],
    [cancelledUndated, "scheduled", undefined, "!"],
    // completed: only with a date
    [null, "completed", undefined, "!"],
    [planned, "completed", undefined, "!"],
    [planned, "completed", D2, "completed"],
    [scheduled, "completed", undefined, "completed"],
    [scheduled, "completed", null, "!"],
    [cancelledUndated, "completed", D2, "completed"],
    // cancelled: with or without
    [null, "cancelled", undefined, "cancelled"],
    [planned, "cancelled", undefined, "cancelled"],
    [scheduled, "cancelled", undefined, "cancelled"],
    [scheduled, "cancelled", null, "cancelled"],
    [completed, "cancelled", D2, "cancelled"],
  ] as [InterviewState | null, InterviewStatus | undefined, Date | null | undefined, string][])(
    "%j, status %s, date %s -> %s",
    (current, status, scheduledAt, expected) => {
      const result = resolveInterviewState(current, { status, scheduledAt });
      expect(result.ok ? result.status : "!").toBe(expected);
    },
  );
});

describe("refusals say what is missing", () => {
  it.each(["scheduled", "completed"] as const)("%s without a date", (status) => {
    const result = resolveInterviewState(planned, { status });
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("Falta a data") });
  });

  it("planned with a date", () => {
    const result = resolveInterviewState(scheduled, { status: "planned" });
    expect(result).toMatchObject({
      ok: false,
      message: expect.stringContaining("prevista não tem data"),
    });
  });
});
