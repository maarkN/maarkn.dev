// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApplicationDossierTabs } from "./dossier-tabs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderTabs() {
  act(() =>
    root.render(
      <ApplicationDossierTabs
        documents={[]}
        artifacts={[]}
        events={[]}
        coverages={[]}
        questions={[]}
        honestyNotes={[]}
        interviews={[]}
        checklistItems={[]}
        checklistAction={async () => ({ ok: true as const })}
      />,
    ),
  );
  return [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
}

/**
 * Task 3.3 da bko-03: as abas viram colchetes, mas o `Tabs` do shadcn/Radix
 * continua por baixo — é ele que entrega `role=tablist`, `aria-selected` e a
 * navegação por setas. Este teste existe para provar que a pintura não levou
 * nada disso junto.
 */
describe("abas do dossiê", () => {
  it("são sete, em notação de colchete, dentro de um tablist", () => {
    const tabs = renderTabs();
    expect(tabs).toHaveLength(7);
    expect(container.querySelectorAll('[role="tablist"]')).toHaveLength(1);
    expect(tabs[0].textContent).toBe("[documentos(0)]");
    expect(tabs[1].textContent).toBe("[timeline(0)]");
  });

  it("marca exatamente uma aba com aria-selected", () => {
    const tabs = renderTabs();
    const selected = tabs.filter(
      (t) => t.getAttribute("aria-selected") === "true",
    );
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toContain("documentos");
  });

  it("a seta direita move a seleção para a aba seguinte", async () => {
    const tabs = renderTabs();
    act(() => tabs[0].focus());
    act(() => {
      tabs[0].dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    // O roving focus do Radix move o foco num `setTimeout`, e a seleção
    // segue o foco (`activationMode` automático).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].getAttribute("aria-selected")).toBe("false");
  });

  it("os colchetes são pintura: não entram na árvore acessível", () => {
    const tabs = renderTabs();
    const hidden = [...tabs[0].querySelectorAll("[aria-hidden]")].map(
      (n) => n.textContent,
    );
    expect(hidden).toEqual(["[", "]"]);
  });
});
