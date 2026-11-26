/**
 * A move of the board, and its "Desfazer" (spec admin-listing, "Arrastar"):
 * undoing puts the application back as the move found it, the stage and the
 * date the move stamped, and leaves alone what someone else changed.
 *
 * The database is a small fake with the two tables the actions touch; the
 * `$transaction` of an array runs its writes in order, as Prisma does.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FunnelStage } from "@prisma/client";
import ptBR from "@/dictionaries/pt-BR.json";

type App = {
  id: string;
  stage: FunnelStage;
  appliedAt: Date | null;
  closedAt: Date | null;
  folderName: string;
  company: { name: string } | null;
  lastMcpTool?: string;
};
type Event = {
  id: string;
  applicationId: string;
  occurredAt: Date;
  type: string;
  fromStage: FunnelStage | null;
  toStage: FunnelStage | null;
  lastMcpTool: string | null;
};

let apps: Map<string, App>;
let events: Event[];

function pick<T extends object>(row: T, select?: Record<string, unknown>) {
  if (!select) return { ...row };
  return Object.fromEntries(Object.keys(select).map((key) => [key, row[key as keyof T]]));
}

const fake = {
  application: {
    findUnique: async ({ where, select }: { where: { id: string }; select?: Record<string, unknown> }) => {
      const row = apps.get(where.id);
      return row ? pick(row, select) : null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<App> }) => {
      const row = apps.get(where.id)!;
      Object.assign(row, data);
      return { ...row };
    },
  },
  applicationEvent: {
    create: async ({ data, select }: { data: Partial<Event>; select?: Record<string, unknown> }) => {
      const row = { fromStage: null, toStage: null, lastMcpTool: null, ...data, id: `ev${events.length + 1}` } as Event;
      events.push(row);
      return pick(row, select);
    },
    findFirst: async ({ where, select }: { where: Partial<Event>; select?: Record<string, unknown> }) => {
      const row = events.find((e) => Object.entries(where).every(([key, value]) => e[key as keyof Event] === value));
      return row ? pick(row, select) : null;
    },
  },
  $transaction: async (writes: Promise<unknown>[]) => {
    const out = [];
    for (const write of writes) out.push(await write);
    return out;
  },
};

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "admin-locale" ? { name, value: "pt-BR" } : undefined) }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { email: "owner@example.com" } }) }));
vi.mock("@/lib/db", () => ({ dbConfigured: true, db: fake }));

const { moveApplicationStage, undoApplicationStageMove } = await import("./actions");

const words = ptBR.admin;

beforeEach(() => {
  apps = new Map();
  events = [];
});

function seed(stage: FunnelStage, dates: Partial<Pick<App, "appliedAt" | "closedAt">> = {}) {
  apps.set("a1", { id: "a1", stage, appliedAt: null, closedAt: null, folderName: "acme-ca", company: { name: "Acme" }, ...dates });
  return apps.get("a1")!;
}

async function moved(stage: FunnelStage) {
  const result = await moveApplicationStage("a1", stage);
  expect(result.ok).toBe(true);
  const eventId = result.ok ? result.data?.eventId : undefined;
  expect(eventId).toBeTruthy();
  return eventId!;
}

describe("undoing a move of the board", () => {
  it("to Enviadas leaves no date of sending behind", async () => {
    const app = seed("ready");
    const eventId = await moved("applied");
    expect(app.appliedAt).toBeInstanceOf(Date);

    const result = await undoApplicationStageMove("a1", eventId);
    expect(result).toEqual({ ok: true, message: "“Acme” foi para Pronta para enviar." });
    expect(app.stage).toBe("ready");
    expect(app.appliedAt).toBeNull();
    // Both changes are on the timeline: it went, and it came back.
    expect(events.map((e) => [e.fromStage, e.toStage])).toEqual([
      ["ready", "applied"],
      ["applied", "ready"],
    ]);
  });

  it("keeps a date of sending that was there before the move", async () => {
    const sent = new Date("2026-10-01T00:00:00.000Z");
    const app = seed("ready", { appliedAt: sent });
    await undoApplicationStageMove("a1", await moved("applied"));
    expect(app.stage).toBe("ready");
    expect(app.appliedAt).toBe(sent);
  });

  it("goes back to the exact stage, not the one that names its column", async () => {
    const app = seed("radar");
    await undoApplicationStageMove("a1", await moved("ready"));
    expect(app.stage).toBe("radar");
  });

  it("does not undo over a change made since, and says where it is", async () => {
    const app = seed("ready");
    const eventId = await moved("applied");
    app.stage = "recruiter_contact";

    const result = await undoApplicationStageMove("a1", eventId);
    expect(result).toEqual({
      ok: false,
      message: "“Acme” mudou de estágio depois disso e está em Contato do recrutador. Recarregue a página.",
    });
    expect(app.stage).toBe("recruiter_contact");
    expect(app.appliedAt).toBeInstanceOf(Date);
    expect(events).toHaveLength(1);
  });

  it("twice is harmless: the second finds it undone", async () => {
    seed("ready");
    const eventId = await moved("applied");
    await undoApplicationStageMove("a1", eventId);
    const again = await undoApplicationStageMove("a1", eventId);
    expect(again.ok).toBe(true);
    expect(events).toHaveLength(2);
  });

  it("only undoes a move of the board, of that application", async () => {
    const app = seed("applied");
    events.push({
      id: "mcp1",
      applicationId: "a1",
      occurredAt: new Date(),
      type: "stage_change",
      fromStage: "ready",
      toStage: "applied",
      lastMcpTool: "update_application_stage",
    });
    for (const [id, eventId] of [["a1", "mcp1"], ["a1", "nope"], ["other", "mcp1"], ["", "mcp1"], ["a1", ""]]) {
      expect(await undoApplicationStageMove(id, eventId)).toEqual({ ok: false, message: words.moves.missing });
    }
    expect(app.stage).toBe("applied");
  });
});

describe("a move of the board", () => {
  it("stamps the date of sending once, and moving back does not erase it", async () => {
    const app = seed("ready");
    await moved("applied");
    const stamped = app.appliedAt;
    await moved("ready");
    expect(app.appliedAt).toBe(stamped);
  });
});
