// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFormat } from "@/lib/format";
import { ApplicationDossierTabs, type DossierInterview } from "./dossier-tabs";

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

function renderTabs(interviews: DossierInterview[] = []) {
  act(() =>
    root.render(
      <ApplicationDossierTabs
        format={createFormat({ locale: "pt-BR", timeZone: "America/Sao_Paulo" })}
        documents={[]}
        artifacts={[]}
        events={[]}
        coverages={[]}
        questions={[]}
        honestyNotes={[]}
        interviews={interviews}
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

describe("aba de entrevistas", () => {
  function interview(
    over: Partial<DossierInterview> & Pick<DossierInterview, "id" | "status" | "kind">,
  ): DossierInterview {
    return {
      round: null,
      scheduledAt: null,
      durationMin: null,
      mode: null,
      timezone: null,
      interviewers: [],
      prepMd: null,
      notesMd: null,
      outcome: null,
      contact: null,
      ...over,
    };
  }

  async function openTab(interviews: DossierInterview[]): Promise<string[][]> {
    const tabs = renderTabs(interviews);
    const tab = tabs.find((t) => t.textContent?.includes("entrevistas"))!;
    await act(async () => {
      tab.focus();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const panel = container.querySelector('[role="tabpanel"][data-state="active"]')!;
    return [...panel.querySelectorAll("tr")].map((row) =>
      [...row.querySelectorAll("th, td")].map((cell) => cell.textContent ?? ""),
    );
  }

  it("mostra as três do processo em ordem, a primeira marcada e as outras previstas", async () => {
    const [head, ...rows] = await openTab([
      interview({
        id: "1",
        kind: "screening",
        status: "scheduled",
        scheduledAt: new Date("2026-12-01T17:30:00.000Z"),
      }),
      interview({ id: "2", kind: "technical", status: "planned", round: 2 }),
      interview({ id: "3", kind: "final", status: "planned" }),
    ]);

    expect(head.slice(0, 4)).toEqual(["#", "Tipo", "Situação", "Quando"]);
    expect(rows.map((row) => row.slice(0, 4))).toEqual([
      ["1", "Triagem", "[scheduled]", "01/12/2026, 14:30"],
      ["2", "Técnicarodada 2", "[planned]", "—"],
      ["3", "Final", "[planned]", "—"],
    ]);
    const titles = [...container.querySelectorAll('[data-slot="status-tag"]')].map((n) =>
      n.getAttribute("title"),
    );
    expect(titles).toEqual(["Marcada", "Prevista", "Prevista"]);
  });

  it("sem nenhuma, diz que não há, em vez de inventar", async () => {
    const [head, ...rows] = await openTab([]);
    expect(head).toHaveLength(7);
    // The empty row is the shared one of rebrand-09, with no `#` in front.
    expect(rows).toEqual([["Nenhuma entrevista registrada."]]);
  });
});
