// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ptBR from "@/dictionaries/pt-BR.json";
import { shellLabels } from "./labels";
import { SearchButton } from "./search-button";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const logoutAction = vi.fn();
vi.mock("@/app/_actions/auth", () => ({ logoutAction: () => logoutAction() }));
const setAdminLocale = vi.fn();
vi.mock("@/app/_actions/preferences", () => ({ setAdminLocale: (locale: string) => setAdminLocale(locale) }));
const list = vi.fn();
vi.mock("@/app/_actions/search", () => ({ listSearchableApplications: () => list() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const APPLICATIONS = [
  { id: "a1", company: "Ipê Data", role: "Backend Engineer" },
  { id: "a2", company: "Orbita Labs", role: "Tech Lead" },
];
const labels = shellLabels(ptBR.admin);

let root: Root;
let container: HTMLDivElement;

const $ = <T extends Element = HTMLElement>(selector: string) => container.querySelector<T>(selector)!;
const input = () => $<HTMLInputElement>("dialog input");
const options = () => [...container.querySelectorAll<HTMLElement>("[role=option]")].map((option) => option.dataset.result);
const selected = () => $("[role=option][aria-selected=true]")?.dataset.result;
const status = () => $("[role=status]").textContent;
const isOpen = () => container.querySelector("dialog")?.open ?? false;
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
const loaded = async () => {
  await act(async () => void (await import("./search-window")));
  await settle();
};

function shortcut(init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", { key: "k", bubbles: true, cancelable: true, ...init });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
}
const key = (name: string) =>
  act(() => {
    input().dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
  });
const escape = () =>
  act(() => {
    $("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));
  });
function type(text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input(), text);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function open() {
  act(() => {
    $("[data-search]").focus();
    $("[data-search]").click();
  });
  await loaded();
  expect(isOpen()).toBe(true);
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
    this.querySelector<HTMLElement>("button")?.focus();
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  Element.prototype.scrollIntoView = vi.fn();
  document.documentElement.setAttribute("data-site-theme", "dusk");
  localStorage.clear();
  for (const mock of [push, logoutAction, setAdminLocale, list]) mock.mockReset();
  list.mockResolvedValue({ ok: true, data: APPLICATIONS });
  setAdminLocale.mockResolvedValue({ ok: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<SearchButton locale="pt-BR" labels={labels} />));
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
});

describe("before it opens", () => {
  it("has no data, neither in the HTML nor asked for", async () => {
    const html = renderToString(<SearchButton locale="pt-BR" labels={labels} />);
    for (const { company } of APPLICATIONS) expect(html).not.toContain(company);
    await settle();
    expect(list).not.toHaveBeenCalled();
    expect(container.querySelector("dialog")).toBeNull();
  });
});

describe("opening", () => {
  it("puts the focus in the field, and asks for the applications each time", async () => {
    await open();
    expect(document.activeElement).toBe(input());
    expect(list).toHaveBeenCalledTimes(1);
    escape();
    // One created in the meantime is found too.
    list.mockResolvedValue({ ok: true, data: [...APPLICATIONS, { id: "a3", company: "Nova", role: null }] });
    await open();
    type("nova");
    expect(options()).toContain("application-a3");
  });

  it("answers ⌘K and Ctrl+K, but not over a window or a menu of the screen", async () => {
    expect(shortcut({ metaKey: true }).defaultPrevented).toBe(true);
    await loaded();
    expect(isOpen()).toBe(true);
    shortcut({ ctrlKey: true });
    expect(isOpen()).toBe(false);
    for (const init of [{}, { ctrlKey: true, shiftKey: true }, { metaKey: true, altKey: true }]) {
      expect(shortcut(init).defaultPrevented).toBe(false);
    }

    const dialog = document.createElement("div");
    dialog.setAttribute("data-slot", "alert-dialog-content");
    dialog.setAttribute("data-state", "open");
    document.body.append(dialog);
    shortcut({ metaKey: true });
    expect(isOpen()).toBe(false);
    dialog.remove();
    shortcut({ metaKey: true });
    expect(isOpen()).toBe(true);
  });

  it("closes with Esc, gives the focus back where it was, and opens empty the next time", async () => {
    const field = document.createElement("input");
    document.body.append(field);
    act(() => field.focus());
    shortcut({ metaKey: true });
    await loaded();
    expect(document.activeElement).toBe(input());
    type("orbita");
    escape();
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(field);
    await open();
    expect(input().value).toBe("");
  });
});

describe("with the keyboard", () => {
  it("opens the dossier of the company typed", async () => {
    await open();
    type("ipe");
    expect(selected()).toBe("application-a1");
    key("Enter");
    expect(push).toHaveBeenCalledWith("/admin/applications/a1");
    expect(isOpen()).toBe(false);
  });

  it("walks the list with the arrows, from the field, round both ends", async () => {
    await open();
    type("criar");
    const active = () => document.getElementById(input().getAttribute("aria-activedescendant")!)?.dataset.result;
    expect(options()).toEqual(["create-application", "create-project", "create-resume"]);
    expect([selected(), active()]).toEqual(["create-application", "create-application"]);
    key("ArrowDown");
    expect([selected(), active()]).toEqual(["create-project", "create-project"]);
    key("ArrowUp");
    key("ArrowUp");
    expect(selected()).toBe("create-resume");
    expect(document.activeElement).toBe(input());
    key("Enter");
    expect(push).toHaveBeenCalledWith("/admin/generator");
  });

  it("runs the actions", async () => {
    await open();
    type("claro suave");
    key("Enter");
    expect(document.documentElement.dataset.siteTheme).toBe("light");
    await open();
    type("english");
    key("Enter");
    expect(setAdminLocale).toHaveBeenCalledWith("en");
    await open();
    type("sair");
    key("Enter");
    expect(logoutAction).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("does not take the Enter that ends a composition for a choice", async () => {
    await open();
    type("ipe");
    act(() => {
      input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, isComposing: true }));
    });
    expect(push).not.toHaveBeenCalled();
  });
});

describe("the answer", () => {
  it("counts what was found, and says when it was nothing", async () => {
    await open();
    type("orbita");
    expect(status()).toBe("1 resultado");
    type("criar");
    expect(status()).toBe("3 resultados");
    type("xyzzy");
    expect(status()).toBe("Nada aqui corresponde a “xyzzy”.");
    expect(options()).toEqual([]);
    expect(input().getAttribute("aria-expanded")).toBe("false");
    key("Enter");
    expect(push).not.toHaveBeenCalled();
  });

  it("does not say nothing was found while the applications are on the way", async () => {
    let arrive: (result: unknown) => void = () => {};
    list.mockReturnValue(new Promise((resolve) => (arrive = resolve)));
    await open();
    type("orbita");
    expect(status()).toBe(ptBR.admin.search.loading);
    await act(async () => arrive({ ok: true, data: APPLICATIONS }));
    expect(options()).toEqual(["application-a2"]);
  });

  it("without the applications, still goes to screens, and tries again", async () => {
    list.mockRejectedValueOnce(new Error("offline"));
    await open();
    expect(status()).toBe(ptBR.admin.search.failed);
    type("auditoria");
    expect(options()).toEqual(["audit"]);

    list.mockResolvedValueOnce({ ok: false, message: "x" });
    const retry = () => [...container.querySelectorAll("button")].find((b) => b.textContent === ptBR.admin.search.retry);
    act(() => retry()!.click());
    await settle();
    expect(status()).toBe(ptBR.admin.search.failed);
    act(() => retry()!.click());
    await settle();
    expect(retry()).toBeUndefined();
    expect(document.activeElement).toBe(input());
    type("orbita");
    expect(options()).toEqual(["application-a2"]);
  });
});
