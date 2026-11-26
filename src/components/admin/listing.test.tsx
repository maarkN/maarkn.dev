// @vitest-environment jsdom
/**
 * A list is a table (spec admin-listing, "Lista semântica"): headers tied to
 * their cells, the order on the header itself, and a row that opens its record
 * by the pointer, with the keyboard reaching the same record through the
 * row's link or button.
 */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { OpensRow, RowLink, SortableHead } = await import("./listing");
const { Table, TableBody, TableCell, TableHeader, TableRow } = await import("@/components/ui/table");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  push.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function list(rows: ReactNode) {
  act(() =>
    root.render(
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Empresa" title="Ordenar por empresa" href="/admin/applications?sort=company&dir=desc" dir="asc" />
            <SortableHead label="Atualizada" title="Ordenar por atualizada" href="/admin/applications?sort=updated&dir=desc" />
          </TableRow>
        </TableHeader>
        <TableBody>{rows}</TableBody>
      </Table>,
    ),
  );
}

const click = (target: Element, init: MouseEventInit = {}) =>
  act(() => {
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...init }));
  });

describe("the header", () => {
  it("is a column header that says the order of the list", () => {
    list(null);
    const [company, updated] = [...container.querySelectorAll("th")];
    expect(company.getAttribute("scope")).toBe("col");
    expect(company.getAttribute("aria-sort")).toBe("ascending");
    expect(updated.hasAttribute("aria-sort")).toBe(false);
  });

  it("orders by a link named by the column, which keeps the order in the address", () => {
    list(null);
    const link = container.querySelector("th a")!;
    expect(link.textContent).toBe("Empresa");
    expect(link.getAttribute("href")).toBe("/admin/applications?sort=company&dir=desc");
    expect(link.getAttribute("title")).toBe("Ordenar por empresa");
  });
});

describe("a row that opens a page", () => {
  const row = (
    <OpensRow href="/admin/applications/a1">
      <TableCell>
        <RowLink href="/admin/applications/a1">Acme</RowLink>
      </TableCell>
      <TableCell>
        <span data-cell>Staff Engineer</span>
        <button type="button">Excluir</button>
      </TableCell>
    </OpensRow>
  );

  it("opens it on a click anywhere", () => {
    list(row);
    click(container.querySelector("[data-cell]")!);
    expect(push).toHaveBeenCalledWith("/admin/applications/a1");
  });

  it("leaves a click on a control of the row to the control", () => {
    list(row);
    click(container.querySelector("button")!);
    click(container.querySelector("td a")!);
    expect(push).not.toHaveBeenCalled();
  });

  it("opens a new tab with a modifier, as a link would", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    list(row);
    click(container.querySelector("[data-cell]")!, { metaKey: true });
    expect(open).toHaveBeenCalledWith("/admin/applications/a1", "_blank", "noopener");
    expect(push).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("is reached by the keyboard through its link, to the same address", () => {
    list(row);
    const link = container.querySelector<HTMLAnchorElement>("td a")!;
    expect(link.getAttribute("href")).toBe("/admin/applications/a1");
    expect(link.tabIndex).toBe(0);
  });
});

describe("a row that opens a window", () => {
  it("presses the control of the row that opens the record", () => {
    const edit = vi.fn();
    list(
      <OpensRow>
        <TableCell>
          <span data-cell>Joana</span>
        </TableCell>
        <TableCell>
          <button type="button" data-row-open="" onClick={edit}>
            Editar
          </button>
        </TableCell>
      </OpensRow>,
    );
    click(container.querySelector("[data-cell]")!);
    expect(edit).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
