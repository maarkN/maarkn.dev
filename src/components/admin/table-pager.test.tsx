// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ListingIndexCell,
  ListingIndexHead,
  TableEmptyRow,
  TableLoadingRow,
  TablePager,
  isEditableTarget,
} from "./table-pager";

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

function press(key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
}

describe("linha de status", () => {
  it("escreve total, página e as duas ações", () => {
    act(() =>
      root.render(
        <TablePager
          page={2}
          totalPages={4}
          total={74}
          onPageChange={() => {}}
        />,
      ),
    );
    expect(container.textContent).toContain("74 registros · página 2/4");
    const labels = [...container.querySelectorAll("button")].map(
      (b) => b.textContent,
    );
    expect(labels).toEqual(["[n]ext", "[p]rev"]);
  });

  it("as etiquetas são <button> de verdade, com nome acessível", () => {
    act(() =>
      root.render(
        <TablePager page={1} totalPages={3} onPageChange={() => {}} />,
      ),
    );
    const [next, prev] = [...container.querySelectorAll("button")];
    expect(next.getAttribute("aria-label")).toBe("Próxima página (tecla n)");
    expect(prev.getAttribute("aria-label")).toBe("Página anterior (tecla p)");
    // Primeira página: só `prev` está travado.
    expect(next.disabled).toBe(false);
    expect(prev.disabled).toBe(true);
  });
});

describe("atalhos n/p", () => {
  it("avançam e voltam quando o foco está fora de campo editável", () => {
    const onPageChange = vi.fn();
    act(() =>
      root.render(
        <TablePager page={2} totalPages={4} onPageChange={onPageChange} />,
      ),
    );
    press("n");
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    press("p");
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it("respeitam o limite da última página", () => {
    const onPageChange = vi.fn();
    act(() =>
      root.render(
        <TablePager page={4} totalPages={4} onPageChange={onPageChange} />,
      ),
    );
    press("n");
    expect(onPageChange).not.toHaveBeenCalled();
  });

  // Cenário "Atalho com filtro em foco" do spec da bko-03.
  it("NÃO disparam com o filtro da toolbar em foco", () => {
    const onPageChange = vi.fn();
    act(() =>
      root.render(
        <TablePager page={2} totalPages={4} onPageChange={onPageChange} />,
      ),
    );
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    expect(document.activeElement).toBe(input);

    const event = press("n");
    expect(onPageChange).not.toHaveBeenCalled();
    // E a tecla segue seu caminho normal até o campo.
    expect(event.defaultPrevented).toBe(false);
    input.remove();
  });

  it("ignoram combinações com modificador", () => {
    const onPageChange = vi.fn();
    act(() =>
      root.render(
        <TablePager page={1} totalPages={4} onPageChange={onPageChange} />,
      ),
    );
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "n", ctrlKey: true, bubbles: true }),
      );
    });
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe("isEditableTarget", () => {
  it.each([
    ["input", true],
    ["textarea", true],
    ["select", true],
    ["button", false],
    ["div", false],
  ])("%s → %s", (tag, expected) => {
    expect(isEditableTarget(document.createElement(tag))).toBe(expected);
  });

  it("pega o <Select> do Radix, que é um button role=combobox", () => {
    const trigger = document.createElement("button");
    trigger.setAttribute("role", "combobox");
    expect(isEditableTarget(trigger)).toBe(true);
  });

  it("pega contenteditable", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    document.body.append(div);
    expect(isEditableTarget(div)).toBe(true);
    div.remove();
  });
});

describe("estados e coluna de índice", () => {
  function renderInTable(children: React.ReactNode) {
    act(() =>
      root.render(
        <table>
          <tbody>{children}</tbody>
        </table>,
      ),
    );
  }

  it("o vazio é uma linha de comentário", () => {
    renderInTable(<TableEmptyRow cols={7} />);
    const cell = container.querySelector("td");
    expect(cell?.textContent).toBe("# nenhum registro");
    expect(cell?.getAttribute("colspan")).toBe("7");
  });

  it("o carregando é uma linha de progresso anunciada como status", () => {
    renderInTable(<TableLoadingRow cols={5} />);
    expect(container.querySelector("[role=status]")?.textContent).toContain(
      "carregando",
    );
    // Os blocos são pintura: não entram na árvore acessível.
    const bar = container.querySelector(".admin-progress");
    expect(bar?.getAttribute("aria-hidden")).toBe("true");
  });

  it("a coluna de índice é decorativa e não é anunciada", () => {
    renderInTable(
      <tr>
        <ListingIndexCell index={0} />
        <ListingIndexCell index={11} />
      </tr>,
    );
    const cells = [...container.querySelectorAll("[data-listing-index]")];
    expect(cells.map((c) => c.textContent)).toEqual(["001", "012"]);
    for (const cell of cells) {
      expect(cell.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("o cabeçalho do índice também é decorativo e tem largura em ch", () => {
    act(() =>
      root.render(
        <table>
          <thead>
            <tr>
              <ListingIndexHead />
            </tr>
          </thead>
        </table>,
      ),
    );
    const th = container.querySelector("th");
    expect(th?.getAttribute("aria-hidden")).toBe("true");
    expect(th?.className).toContain("w-[7ch]");
    // A semântica de tabela não pode sair junto com a pintura.
    expect(th?.getAttribute("scope")).toBe("col");
  });
});
