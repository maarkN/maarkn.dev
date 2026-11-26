// @vitest-environment jsdom
/**
 * The board of applications (spec admin-listing, "Quadro de candidaturas"):
 * the real count in each column and what is past the cap; a card moved by
 * dragging or by the arrows goes at once, and comes back to its column with the
 * reason when the server refuses; a move that went through can be undone, by
 * the event it recorded. A card moved by the arrows keeps the focus, wherever
 * the answer of the server puts it.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FunnelStage } from "@prisma/client";
import type { ActionResult } from "@/app/_actions/action-result";
import { ADMIN_WORDS, WithAdminWords } from "@/components/admin/test-labels";
import { emptyBoard, type BoardCard, type BoardData, type StageMove } from "./kanban-types";

const custom = vi.fn();
vi.mock("sonner", () => ({ toast: { custom: (...args: unknown[]) => custom(...args), dismiss: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { KanbanBoard, placeCard } = await import("./kanban-board");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const words = ADMIN_WORDS["pt-BR"];
let root: Root;
let container: HTMLDivElement;
const moveAction = vi.fn<(id: string, stage: FunnelStage) => Promise<ActionResult<StageMove>>>();
const undoAction = vi.fn<(id: string, eventId: string) => Promise<ActionResult>>();

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  moveAction.mockReset();
  undoAction.mockReset();
  custom.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const card = (id: string, company: string, stage: FunnelStage, priority: number | null = null): BoardCard => ({
  id,
  company,
  role: "Backend Engineer",
  stage,
  place: null,
  priority,
  followUp: null,
});

/** Acme is in the radar: a stage of Selecionadas that is not the one a drop there gives. */
function board() {
  const data = emptyBoard(false);
  data.columns.selected = { count: 30, cards: [card("a", "Acme", "radar")] };
  data.columns.ready = { count: 1, cards: [card("b", "Beta", "package_ready")] };
  data.total = 31;
  return data;
}

/** The board as the server sends it: at first, and again after a revalidation. */
function render(data: BoardData = board()) {
  act(() =>
    root.render(
      <WithAdminWords>
        <KanbanBoard
          data={data}
          cap={25}
          words={{ board: words.board, vocab: words.vocab, priority: words.applications.priority }}
          moveAction={moveAction}
          undoAction={undoAction}
        />
      </WithAdminWords>,
    ),
  );
}

const column = (key: string) => container.querySelector<HTMLElement>(`[data-column="${words.vocab.column[key as "selected"]}"]`)!;
const cardIn = (key: string, id: string) => column(key).querySelector(`[data-card="${id}"]`);
const link = (id: string) => container.querySelector<HTMLAnchorElement>(`[data-card="${id}"] [data-card-link]`)!;
const press = (id: string, key: string, init: KeyboardEventInit = {}) =>
  act(() => {
    link(id).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });
/** The notice of the n-th call, as the board built it. */
const notice = (n = 0) => custom.mock.calls[n][0]("id") as { props: { title: string; tone: string; action?: { label: string; onClick: () => void } } };
const stageOf = (key: string, id: string) => cardIn(key, id)?.querySelector("[data-stage]")?.textContent;
const focusedCard = () => document.activeElement?.closest("[data-card]")?.getAttribute("data-card");
const focusedColumn = () => document.activeElement?.closest("section[data-column]")?.getAttribute("data-column");

/** The board after the server recorded the move of Acme to Prontas, as the revalidation brings it. */
function revalidated(order: "after" | "before" = "after") {
  const data = board();
  const moved = card("a", "Acme", "ready");
  const other = card("b", "Beta", "package_ready");
  data.columns.selected = { count: 29, cards: [] };
  data.columns.ready = { count: 2, cards: order === "after" ? [other, moved] : [moved, other] };
  return data;
}

function deferred<T = undefined>() {
  let resolve!: (value: ActionResult<T>) => void;
  const promise = new Promise<ActionResult<T>>((r) => (resolve = r));
  return { promise, resolve };
}

describe("the columns", () => {
  it("are six, in the order of the funnel, each named with its real count", () => {
    render();
    const names = [...container.querySelectorAll("section[data-column]")].map((s) => s.getAttribute("aria-label"));
    expect(names).toEqual([
      "Selecionadas: 30",
      "Prontas: 1",
      "Enviadas: 0",
      "Em conversa: 0",
      "Avaliação e entrevistas: 0",
      "Ofertas: 0",
    ]);
  });

  it("say how many are not shown past the cap", () => {
    render();
    expect(column("selected").textContent).toContain("Mais 29 não aparecem aqui.");
    expect(column("ready").textContent).not.toContain("não aparece");
  });

  it("write the keys of the board on screen, and every card points to them", () => {
    render();
    const hint = [...container.querySelectorAll("p")].find((p) => p.textContent === words.board.keys)!;
    expect(hint).toBeDefined();
    expect(link("a").getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("show each stage by its name and the mark of its phase", () => {
    render();
    const stage = cardIn("selected", "a")!.querySelector("[data-stage]")!;
    expect(stage.textContent).toBe("Radar");
    expect(stage.querySelector("svg[data-phase='pre_send']")).not.toBeNull();
  });
});

describe("moving with the arrows", () => {
  it("moves the card at once, and back with the reason when the server refuses", async () => {
    const answer = deferred<StageMove>();
    moveAction.mockReturnValue(answer.promise);
    render();
    press("a", "ArrowRight");
    expect(moveAction).toHaveBeenCalledWith("a", "ready");
    // Pending: the card is already in the next column.
    expect(cardIn("ready", "a")).not.toBeNull();
    expect(cardIn("selected", "a")).toBeNull();

    await act(async () => answer.resolve({ ok: false, message: "O banco não gravou a mudança. Tente de novo." }));
    expect(cardIn("selected", "a")).not.toBeNull();
    expect(cardIn("ready", "a")).toBeNull();
    expect(notice().props.tone).toBe("bad");
    expect(notice().props.title).toBe("Não foi possível mover “Acme”. Ela continua em Selecionadas.");
    expect(notice().props.action?.label).toBe("Tentar de novo");
  });

  it("comes back to its column when the action throws", async () => {
    moveAction.mockRejectedValue(new Error("network"));
    render();
    press("a", "ArrowRight");
    await act(async () => {});
    expect(cardIn("selected", "a")).not.toBeNull();
    expect(notice().props.tone).toBe("bad");
  });

  it("says where it went, and undoes that move, back to the exact stage it had", async () => {
    moveAction.mockResolvedValue({ ok: true, data: { eventId: "ev1" } });
    const answer = deferred();
    undoAction.mockReturnValue(answer.promise);
    render();
    press("a", "ArrowRight");
    await act(async () => {});
    render(revalidated());
    expect(notice().props.title).toBe("“Acme” foi para Prontas.");
    expect(notice().props.action?.label).toBe("Desfazer");

    await act(async () => notice().props.action!.onClick());
    // The server undoes the move it recorded (and the date it stamped), not a new move.
    expect(undoAction).toHaveBeenCalledWith("a", "ev1");
    expect(moveAction).toHaveBeenCalledTimes(1);
    // Pending: back in Selecionadas, in the radar, not in the stage a drop there gives.
    expect(stageOf("selected", "a")).toBe("Radar");
    expect(cardIn("ready", "a")).toBeNull();

    await act(async () => answer.resolve({ ok: true }));
    expect(notice(1).props.title).toBe("“Acme” voltou para Selecionadas.");
  });

  it("says where the card stays when undoing is refused", async () => {
    moveAction.mockResolvedValue({ ok: true, data: { eventId: "ev1" } });
    undoAction.mockResolvedValue({ ok: false, message: "O banco não gravou a mudança." });
    render();
    press("a", "ArrowRight");
    await act(async () => {});
    render(revalidated());
    await act(async () => notice().props.action!.onClick());
    expect(cardIn("ready", "a")).not.toBeNull();
    expect(notice(1).props.tone).toBe("bad");
    expect(notice(1).props.title).toBe("Não foi possível mover “Acme”. Ela continua em Prontas.");
    expect(notice(1).props.action?.label).toBe("Tentar de novo");
  });

  it("offers no undo when the server moved nothing", async () => {
    moveAction.mockResolvedValue({ ok: true, message: "“Acme” já está em Pronta para enviar." });
    render();
    press("a", "ArrowRight");
    await act(async () => {});
    expect(notice().props.action).toBeUndefined();
  });

  it("takes the focus with the card, and back with it when the server refuses", async () => {
    const answer = deferred<StageMove>();
    moveAction.mockReturnValue(answer.promise);
    render();
    act(() => link("a").focus());
    press("a", "ArrowRight");
    expect(focusedCard()).toBe("a");
    expect(focusedColumn()).toBe("Prontas");

    await act(async () => answer.resolve({ ok: false, message: "O banco não gravou a mudança." }));
    expect(focusedCard()).toBe("a");
    expect(focusedColumn()).toBe("Selecionadas");
  });

  it("keeps the focus on the card when the answer of the server puts it in another place", async () => {
    const answer = deferred<StageMove>();
    moveAction.mockReturnValue(answer.promise);
    render();
    act(() => link("a").focus());
    press("a", "ArrowRight");
    expect(focusedColumn()).toBe("Prontas");

    // The revalidated board arrives with the transition, the card below Beta.
    await act(async () => {
      render(revalidated("after"));
      answer.resolve({ ok: true, data: { eventId: "ev1" } });
    });
    expect(cardIn("ready", "a")).not.toBeNull();
    expect(focusedCard()).toBe("a");
  });

  it("leaves the focus alone once the move is over", async () => {
    moveAction.mockResolvedValue({ ok: true, data: { eventId: "ev1" } });
    render();
    act(() => link("a").focus());
    press("a", "ArrowRight");
    await act(async () => {});
    render(revalidated());
    act(() => (document.activeElement as HTMLElement).blur());
    render(revalidated("before"));
    expect(document.activeElement).toBe(document.body);
  });

  it("goes nowhere past the first column, nor with a modifier", () => {
    render();
    press("a", "ArrowLeft");
    press("a", "ArrowRight", { shiftKey: true });
    press("a", "ArrowRight", { metaKey: true });
    expect(moveAction).not.toHaveBeenCalled();
  });
});

describe("dragging", () => {
  it("moves the card to the column it is dropped on, with the stage that names it", async () => {
    moveAction.mockResolvedValue({ ok: true });
    render();
    const target = column("talking");
    act(() => {
      cardIn("selected", "a")!.dispatchEvent(new Event("dragstart", { bubbles: true }));
    });
    act(() => {
      target.dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));
    });
    expect(target.hasAttribute("data-drop-target")).toBe(true);
    await act(async () => {
      target.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true }));
    });
    expect(moveAction).toHaveBeenCalledWith("a", "recruiter_contact");
    expect(target.hasAttribute("data-drop-target")).toBe(false);
  });

  it("does nothing when dropped back on its own column", async () => {
    render();
    act(() => {
      cardIn("selected", "a")!.dispatchEvent(new Event("dragstart", { bubbles: true }));
    });
    await act(async () => {
      column("selected").dispatchEvent(new Event("drop", { bubbles: true, cancelable: true }));
    });
    expect(moveAction).not.toHaveBeenCalled();
  });
});

describe("placeCard", () => {
  it("keeps the counts true while a move is pending", () => {
    const data = emptyBoard(false);
    data.columns.selected = { count: 30, cards: [card("a", "Acme", "shortlisted")] };
    const next = placeCard(data.columns, { id: "a", to: "sent", stage: "applied" });
    expect(next.selected.count).toBe(29);
    expect(next.sent).toEqual({ count: 1, cards: [{ ...card("a", "Acme", "applied") }] });
  });

  it("puts the card where the server will: first among its priority, the ones without one last", () => {
    const into = (moved: BoardCard) => {
      const data = emptyBoard(false);
      data.columns.selected = { count: 1, cards: [moved] };
      data.columns.sent = {
        count: 3,
        cards: [card("p1", "P1", "applied", 1), card("p2", "P2", "applied", 2), card("none", "None", "applied")],
      };
      return placeCard(data.columns, { id: moved.id, to: "sent", stage: "applied" }).sent.cards.map((c) => c.id);
    };
    expect(into(card("a", "Acme", "ready", 2))).toEqual(["p1", "a", "p2", "none"]);
    expect(into(card("a", "Acme", "ready", 1))).toEqual(["a", "p1", "p2", "none"]);
    expect(into(card("a", "Acme", "ready", 3))).toEqual(["p1", "p2", "a", "none"]);
    expect(into(card("a", "Acme", "ready"))).toEqual(["p1", "p2", "a", "none"]);
  });
});
