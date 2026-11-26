// @vitest-environment jsdom
/**
 * The pager and the states of a list (spec admin-listing): the keys written
 * where their action is, inactive in a field of text; the four states told
 * apart, each with its next step.
 */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StateMessage, TablePager, TableStateRow, isEditableTarget } from "./table-pager";
import { ADMIN_WORDS, WithAdminWords } from "./test-labels";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode } & Record<string, unknown>) => (
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

const render = (node: ReactNode, locale: "pt-BR" | "en" = "pt-BR") =>
  act(() => root.render(<WithAdminWords locale={locale}>{node}</WithAdminWords>));

describe("the pager", () => {
  it("writes the total and the page in words, in the language of the screen", () => {
    render(<TablePager page={2} totalPages={4} total={74} onPageChange={() => {}} />);
    expect(container.textContent).toContain("74 registros · Página 2 de 4");
    render(<TablePager page={2} totalPages={4} total={1} onPageChange={() => {}} />, "en");
    expect(container.textContent).toContain("1 record · Page 2 of 4");
  });

  it("names its buttons by their visible word and writes their key on them", () => {
    render(<TablePager page={1} totalPages={3} onPageChange={() => {}} />);
    const nav = container.querySelector("nav")!;
    expect(nav.getAttribute("aria-label")).toBe(ADMIN_WORDS["pt-BR"].common.pager.label);
    const [prev, next] = [...nav.querySelectorAll("button")];
    // The key is on screen, beside the word, and told to whoever cannot see it.
    expect(prev.textContent).toBe("AnteriorP");
    expect(next.textContent).toBe("PróximaN");
    expect(prev.getAttribute("aria-keyshortcuts")).toBe("p");
    expect(next.getAttribute("aria-keyshortcuts")).toBe("n");
    // SC 2.5.3: the name is the visible word; no aria-label replaces it.
    expect(next.getAttribute("aria-label")).toBeNull();
    // First page: only "Anterior" is off.
    expect(next.disabled).toBe(false);
    expect(prev.disabled).toBe(true);
  });
});

describe("atalhos n/p", () => {
  it("avançam e voltam quando o foco está fora de campo editável", () => {
    const onPageChange = vi.fn();
    act(() =>
      root.render(
        <WithAdminWords>
          <TablePager page={2} totalPages={4} onPageChange={onPageChange} />
        </WithAdminWords>,
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
        <WithAdminWords>
          <TablePager page={4} totalPages={4} onPageChange={onPageChange} />
        </WithAdminWords>,
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
        <WithAdminWords>
          <TablePager page={2} totalPages={4} onPageChange={onPageChange} />
        </WithAdminWords>,
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
        <WithAdminWords>
          <TablePager page={1} totalPages={4} onPageChange={onPageChange} />
        </WithAdminWords>,
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

describe("the states of a list", () => {
  const table = (node: ReactNode) => (
    <table>
      <tbody>{node}</tbody>
    </table>
  );

  it("spans the whole table", () => {
    render(table(<TableStateRow cols={7} state="empty" message="Nenhuma candidatura ainda." />));
    expect(container.querySelector("td")?.getAttribute("colspan")).toBe("7");
  });

  it("says loading as a status, with a bar that is decoration", () => {
    render(table(<TableStateRow cols={3} state="loading" message="Carregando as candidaturas…" />));
    expect(container.querySelector("[role=status]")?.textContent).toBe("Carregando as candidaturas…");
    expect(container.querySelector(".admin-progress")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("gives every state but loading its next step, as a link", () => {
    for (const [state, href, label] of [
      ["empty", "/admin/applications/new", "Nova candidatura"],
      ["filtered", "/admin/applications", "Limpar filtros"],
      ["failed", "/admin/applications?q=acme", "Tentar de novo"],
    ] as const) {
      render(<StateMessage state={state} message="…" action={{ href, label }} />);
      const link = container.querySelector("a")!;
      expect(link.getAttribute("href"), state).toBe(href);
      expect(link.textContent, state).toBe(label);
    }
  });

  it("marks a failure, so it is never read as an empty list", () => {
    render(<StateMessage state="failed" message="As candidaturas não carregaram." />);
    expect(container.querySelector("[data-list-state=failed]")).not.toBeNull();
    render(<StateMessage state="empty" message="Nenhuma candidatura ainda." />);
    expect(container.querySelector("[data-list-state=empty]")).not.toBeNull();
  });
});
