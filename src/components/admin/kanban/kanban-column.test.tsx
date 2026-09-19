// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KanbanColumn } from "./kanban-column";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

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

/**
 * Cenário "Coluna acima do teto" do spec da bko-03.
 *
 * O teto real é `BOARD_CARDS_PER_COLUMN = 25` (board-data.ts) e o cabeçalho
 * mostra a contagem do `groupBy`, não `cards.length` — é exatamente essa
 * diferença que o rodapé `… +N` torna visível.
 */
describe("coluna acima do teto", () => {
  const CAP = 25;

  function renderColumn(count: number, shown: number) {
    act(() =>
      root.render(
        <KanbanColumn
          name="rejected"
          title="Recusada"
          count={count}
          href="/admin/applications?stage=rejected"
          hiddenCount={Math.max(0, count - shown)}
        >
          {Array.from({ length: shown }, (_, i) => (
            <article key={i}>card {i}</article>
          ))}
        </KanbanColumn>,
      ),
    );
  }

  it("30 registros com teto de 25: cabeçalho 30, 25 cards, rodapé … +5", () => {
    renderColumn(30, CAP);
    const header = container.querySelector("header");
    expect(header?.textContent).toContain("rejected/");
    expect(header?.textContent).toContain("(30)");
    expect(container.querySelectorAll("article")).toHaveLength(CAP);
    expect(container.textContent).toContain("… +5");
  });

  it("dentro do teto não mostra rodapé nenhum", () => {
    renderColumn(4, 4);
    expect(container.textContent).not.toContain("… +");
  });

  it("o nome acessível carrega o rótulo legível e a contagem", () => {
    renderColumn(30, CAP);
    expect(
      container.querySelector("section")?.getAttribute("aria-label"),
    ).toBe("Recusada: 30");
  });

  it("a coluna vazia colapsa numa faixa, sem sumir do funil", () => {
    act(() =>
      root.render(<KanbanColumn name="ghosted" title="Ghosting" count={0} />),
    );
    expect(container.textContent).toContain("ghosted/");
    expect(container.textContent).toContain("(0)");
    expect(container.querySelector("section")).toBeNull();
  });
});
