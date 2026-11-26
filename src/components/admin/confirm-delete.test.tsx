// @vitest-environment jsdom
/**
 * The destructive window is where a careless detail costs a record. What it
 * promises (spec admin-forms, "Confirmação destrutiva"):
 *
 *   1. the button that deletes stays off until the typed name is the name;
 *   2. it says what is lost;
 *   3. the default is not to go ahead: the cancel button has the focus, and
 *      `Esc` closes without deleting and gives the focus back to the opener;
 *   4. a refusal of the server keeps the window open, says why and offers to
 *      try again; the action is only called by the button.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/app/_actions/action-result";
import { WithAdminWords } from "./test-labels";

const custom = vi.fn();
vi.mock("sonner", () => ({ toast: { custom: (...args: unknown[]) => custom(...args), dismiss: vi.fn() } }));

const { ConfirmDelete } = await import("./confirm-delete");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
const action = vi.fn<(id: string) => Promise<ActionResult>>();

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  action.mockReset();
  custom.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const dialog = () => document.querySelector('[data-slot="alert-dialog-content"]');
const trigger = () => container.querySelector<HTMLButtonElement>("button")!;
const confirm = () => document.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')!;
const cancel = () => document.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-cancel"]')!;
const field = () => dialog()!.querySelector<HTMLInputElement>("input")!;

function open() {
  act(() =>
    root.render(
      <WithAdminWords>
        <ConfirmDelete
          id="app-1"
          name="Acme"
          title="Excluir a candidatura Acme?"
          lost="Ela sai do funil com o histórico."
          confirmLabel="Excluir candidatura"
          triggerLabel="Excluir a candidatura Acme"
          action={action}
        />
      </WithAdminWords>,
    ),
  );
  // A programmatic click does not move the focus in jsdom, and the focus on the
  // opener is what Radix keeps to give back.
  act(() => {
    trigger().focus();
    trigger().click();
  });
}

function type(value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(field(), value);
    field().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Radix gives the focus back in a `setTimeout(…, 0)`. */
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

describe("ConfirmDelete", () => {
  it("is opened by a button named after what it deletes", () => {
    open();
    expect(trigger().getAttribute("aria-label")).toBe("Excluir a candidatura Acme");
  });

  it("says what is lost, and that it cannot be undone", () => {
    open();
    const text = dialog()!.textContent ?? "";
    expect(text).toContain("Ela sai do funil com o histórico.");
    expect(text).toContain("Não dá para desfazer.");
  });

  it("keeps the button off until the name typed is the name", () => {
    open();
    expect(confirm().disabled).toBe(true);
    for (const partial of ["Acm", "acme", "Acme Inc"]) {
      type(partial);
      expect(confirm().disabled, partial).toBe(true);
    }
    type("Acme");
    expect(confirm().disabled).toBe(false);
  });

  it("names the field by what is asked, with the name in it", () => {
    open();
    const label = document.querySelector(`label[for="${field().id}"]`)!;
    expect(label.textContent).toBe("Para confirmar, digite o nome: Acme");
  });

  it("has the focus on cancel when it opens", () => {
    open();
    expect(document.activeElement).toBe(cancel());
    expect(cancel().textContent).toBe("Cancelar");
  });

  it("closes with Esc without deleting, and gives the focus back", async () => {
    open();
    type("Acme");
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(dialog()).toBeNull();
    expect(action).not.toHaveBeenCalled();
    await settle();
    expect(document.activeElement).toBe(trigger());
  });

  it("deletes with the button, closes and says so", async () => {
    action.mockResolvedValue({ ok: true, message: "Candidatura “Acme” excluída." });
    open();
    type("Acme");
    await act(async () => confirm().click());
    expect(action).toHaveBeenCalledWith("app-1");
    expect(dialog()).toBeNull();
    expect(custom).toHaveBeenCalledTimes(1);
  });

  it("stays open when the server refuses, and offers to try again", async () => {
    action.mockResolvedValue({ ok: false, message: "Não foi possível excluir a candidatura." });
    open();
    type("Acme");
    await act(async () => confirm().click());
    expect(dialog()).not.toBeNull();
    expect(custom).toHaveBeenCalledTimes(1);
    // The notice is built by the call: its action is "Tentar de novo".
    const notice = custom.mock.calls[0][0]("id") as { props: { title: string; action?: { label: string } } };
    expect(notice.props.title).toBe("Não foi possível excluir a candidatura.");
    expect(notice.props.action?.label).toBe("Tentar de novo");
  });
});
