// @vitest-environment jsdom
/**
 * The board of applications (spec admin-listing, "Quadro de candidaturas"):
 * the real count in each column and what is past the cap; a card moved by
 * dragging or by the arrows goes at once, and comes back to its column with the
 * reason when the server refuses; a move that went through can be undone.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FunnelStage } from "@prisma/client";
import type { ActionResult } from "@/app/_actions/action-result";
import { ADMIN_WORDS, WithAdminWords } from "@/components/admin/test-labels";
import { emptyBoard, type BoardCard } from "./kanban-types";

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
const moveAction = vi.fn<(id: string, stage: FunnelStage) => Promise<ActionResult>>();

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  moveAction.mockReset();
  custom.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const card = (id: string, company: string, stage: FunnelStage): BoardCard => ({
  id,
  company,
  role: "Backend Engineer",
  stage,
  place: null,
  priority: null,
  followUp: null,
});

function render() {
  const data = emptyBoard(false);
  data.columns.selected = { count: 30, cards: [card("a", "Acme", "shortlisted")] };
  data.columns.ready = { count: 1, cards: [card("b", "Beta", "package_ready")] };
  data.total = 31;
  act(() =>
    root.render(
      <WithAdminWords>
        <KanbanBoard
          data={data}
          cap={25}
          words={{ board: words.board, vocab: words.vocab, priority: words.applications.priority }}
          moveAction={moveAction}
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

function deferred() {
  let resolve!: (value: ActionResult) => void;
  const promise = new Promise<ActionResult>((r) => (resolve = r));
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
    expect(stage.textContent).toBe("Selecionada");
    expect(stage.querySelector("svg[data-phase='pre_send']")).not.toBeNull();
  });
});

describe("moving with the arrows", () => {
  it("moves the card at once, and back with the reason when the server refuses", async () => {
    const answer = deferred();
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

  it("says where it went, and undoes to the exact stage it had", async () => {
    moveAction.mockResolvedValue({ ok: true });
    render();
    press("a", "ArrowRight");
    await act(async () => {});
    expect(notice().props.title).toBe("“Acme” foi para Prontas.");
    expect(notice().props.action?.label).toBe("Desfazer");

    await act(async () => notice().props.action!.onClick());
    expect(moveAction).toHaveBeenLastCalledWith("a", "shortlisted");
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
});
