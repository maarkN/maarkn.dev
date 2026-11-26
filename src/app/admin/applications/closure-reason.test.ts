import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClosureReason, FunnelStage } from "@prisma/client";
import { FUNNEL_STAGES, acceptsClosureReason } from "@/lib/applications";

/**
 * The three ways the backoffice writes `Application.stage`: the dossier, the
 * board and the full form. Each has to remove the closure reason when the
 * application leaves rejected/withdrawn, in the same write as the stage, and
 * leave both in the history. (The MCP's way is in `src/lib/mcp/tools`.)
 */

type Application = { stage: FunnelStage; closureReason: ClosureReason | null };
type Write = { model: string; data: Record<string, unknown> };

const state = vi.hoisted(() => ({
  session: null as { user: { email: string } } | null,
  application: {} as Record<string, unknown>,
  writes: [] as { model: string; data: Record<string, unknown> }[],
  transactions: [] as number[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
// The board and the form write their messages in the language of the request (A4).
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "admin-locale" ? { name, value: "pt-BR" } : undefined) }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/db", () => {
  // Prisma only sends a query when it is awaited: the write is recorded there,
  // so a promise handed to `$transaction` is not counted as a write of its own.
  const write = (model: string) => (args: { data: Record<string, unknown> }) => ({
    then: (resolve: (value: unknown) => void) => {
      state.writes.push({ model, data: args.data });
      if (model === "application") Object.assign(state.application, args.data);
      resolve({ id: "app_1" });
    },
  });
  return {
    dbConfigured: true,
    db: {
      application: {
        findUnique: async () => ({
          folderName: "acme--engineer",
          company: null,
          appliedAt: null,
          closedAt: null,
          ...state.application,
        }),
        update: write("application"),
      },
      applicationEvent: { create: write("event") },
      company: {
        findUnique: async () => ({ id: "company_1", careersUrl: null, market: null }),
        update: async () => ({}),
      },
      $transaction: async (operations: PromiseLike<unknown>[]) => {
        state.transactions.push(operations.length);
        return Promise.all(operations);
      },
    },
  };
});

const dossier = await import("./[id]/actions");
const board = await import("./board/actions");
const form = await import("@/app/_actions/applications");

function formData(stage: FunnelStage): FormData {
  const data = new FormData();
  data.set("company", "Acme");
  data.set("stage", stage);
  data.set("source", "linkedin");
  return data;
}

const PATHS: [string, (stage: FunnelStage) => Promise<unknown>][] = [
  ["dossier", (stage) => dossier.moveApplicationStage("app_1", stage)],
  ["board", (stage) => board.moveApplicationStage("app_1", stage)],
  [
    "form",
    async (stage) => {
      // The form redirects when it saves.
      await expect(
        form.updateApplication("app_1", { status: "idle" }, formData(stage)),
      ).rejects.toThrow(/^redirect:\/admin\/applications\?saved=/);
    },
  ],
];

function given(application: Application) {
  state.application = { ...application };
}
const writesOf = (model: string): Write[] => state.writes.filter((write) => write.model === model);

beforeEach(() => {
  state.session = { user: { email: "admin@example.com" } };
  state.writes = [];
  state.transactions = [];
});

describe.each(PATHS)("%s", (_name, move) => {
  const leaving = (["rejected", "withdrawn"] as const).flatMap((from) =>
    FUNNEL_STAGES.filter((to) => to !== from).map((to) => ({ from, to })),
  );

  it.each(leaving)("$from -> $to", async ({ from, to }) => {
    given({ stage: from, closureReason: "visa" });
    await move(to);

    const keeps = acceptsClosureReason(to);
    expect(state.application).toMatchObject({ stage: to, closureReason: keeps ? "visa" : null });

    // One write to the application, with the event, in one transaction.
    expect(writesOf("application")).toHaveLength(1);
    expect(state.transactions).toEqual([2]);
    expect(writesOf("event")).toEqual([
      {
        model: "event",
        data: expect.objectContaining({
          applicationId: "app_1",
          type: "stage_change",
          fromStage: from,
          toStage: to,
          bodyMd: keeps ? null : "Motivo de encerramento removido: Visto.",
        }),
      },
    ]);
  });

  it("with no reason to remove, the reason is not even written", async () => {
    given({ stage: "rejected", closureReason: null });
    await move("interview");
    expect(writesOf("application")[0].data).not.toHaveProperty("closureReason");
    expect(writesOf("event")[0].data).toMatchObject({ bodyMd: null });
  });

  it("without a session, nothing is written", async () => {
    given({ stage: "rejected", closureReason: "visa" });
    state.session = null;
    await move("interview").catch(() => {});
    expect(state.writes).toEqual([]);
  });
});

it("form: saving without moving the stage keeps the reason and adds no event", async () => {
  given({ stage: "rejected", closureReason: "visa" });
  await PATHS[2][1]("rejected");
  expect(state.application).toMatchObject({ stage: "rejected", closureReason: "visa" });
  expect(writesOf("application")).toHaveLength(1);
  expect(writesOf("event")).toHaveLength(0);
});
