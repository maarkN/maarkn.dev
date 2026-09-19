// @vitest-environment jsdom
/**
 * O diálogo destrutivo é o lugar onde um enfeite mal colocado custa um
 * registro. Estes testes travam as quatro coisas que a bko-04 promete e que
 * nenhuma change futura pode afrouxar:
 *
 *   1. o eco `rm -rf …` aparece, com `[y/N]`;
 *   2. o eco é ILUSTRATIVO — a Server Action só é chamada pelo botão, nunca
 *      por abrir o diálogo;
 *   3. a confirmação forte por digitação continua sendo o freio: o botão só
 *      habilita com o nome EXATO;
 *   4. o padrão é cancelar — o foco inicial cai no `[ cancelar ]`, e Esc
 *      fecha devolvendo o foco ao gatilho.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/app/_actions/action-result";

const deleteApplication = vi.fn<(id: string) => Promise<ActionResult>>();
vi.mock("@/app/_actions/applications", () => ({
  deleteApplication: (id: string) => deleteApplication(id),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { DeleteApplicationButton } = await import("./delete-application-button");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  deleteApplication.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const PROPS = {
  id: "app-1",
  company: "Acme",
  folderName: "acme--senior-backend",
};

/** O conteúdo é portalizado: procure no documento, não no container. */
const dialog = () => document.querySelector('[data-slot="alert-dialog-content"]');
const trigger = () =>
  container.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!;
const confirmButton = () =>
  document.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')!;
const footerCancel = () =>
  document.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-cancel"]')!;
const confirmInput = () =>
  document.querySelector<HTMLInputElement>("#confirm-delete-app-1")!;

function open() {
  act(() => root.render(<DeleteApplicationButton {...PROPS} />));
  // `click()` programático não move o foco no jsdom, e é o foco no gatilho
  // que o Radix guarda para devolver no fechamento. Focar antes reproduz o
  // que o clique de verdade faz.
  act(() => {
    trigger().focus();
    trigger().click();
  });
}

/**
 * O `FocusScope` do Radix devolve o foco num `setTimeout(…, 0)` do cleanup de
 * desmontagem — sem drenar a macrotask, o foco ainda está no `<body>`.
 */
async function flushFocusRestore() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function type(value: string) {
  const input = confirmInput();
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("DeleteApplicationButton", () => {
  it("ecoa o comando equivalente com [y/N]", () => {
    open();
    const text = dialog()!.textContent ?? "";
    expect(text).toContain("rm -rf applications/acme--senior-backend");
    expect(text).toContain("[y/N]");
  });

  it("o eco é ilustrativo: abrir o diálogo não chama a action", () => {
    open();
    expect(deleteApplication).not.toHaveBeenCalled();
  });

  it("o botão de confirmação só habilita com o nome exato", () => {
    open();
    expect(confirmButton().disabled).toBe(true);

    type("Acm");
    expect(confirmButton().disabled).toBe(true);

    type("acme");
    expect(confirmButton().disabled).toBe(true);

    type("Acme");
    expect(confirmButton().disabled).toBe(false);
  });

  it("rotula as duas ações entre colchetes, no texto do botão", () => {
    open();
    expect(footerCancel().textContent).toBe("[ cancelar ]");
    expect(confirmButton().textContent).toBe("[ excluir definitivamente ]");
    // Colchete é texto, não conteúdo gerado: nenhum pseudo-elemento envolvido.
    expect(confirmButton().querySelectorAll("[aria-hidden]")).toHaveLength(0);
  });

  it("o padrão é cancelar: o foco inicial cai no [ cancelar ] do rodapé", () => {
    open();
    expect(document.activeElement).toBe(footerCancel());
  });

  it("Esc fecha e devolve o foco ao gatilho", async () => {
    open();
    expect(dialog()).not.toBeNull();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(dialog()).toBeNull();
    await flushFocusRestore();
    expect(document.activeElement).toBe(trigger());
  });

  it("oferece [esc] como fechamento além do rodapé", async () => {
    open();
    const esc = Array.from(
      document.querySelectorAll<HTMLButtonElement>("button"),
    ).find((b) => b.textContent === "[esc]");
    expect(esc).toBeDefined();
    expect(esc!.getAttribute("aria-label")).toBe("cancelar [esc]");

    act(() => esc!.click());
    expect(dialog()).toBeNull();
    await flushFocusRestore();
    expect(document.activeElement).toBe(trigger());
  });
});
