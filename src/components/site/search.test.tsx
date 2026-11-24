// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import { SITE_THEMES } from "@/lib/site-theme";
import type { SearchItem } from "@/lib/site/search";
import { chromeLabels } from "./labels";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/en/projects",
  useSearchParams: () => new URLSearchParams("cat=ai"),
}));

const page = (id: string, title: string, terms: string[] = []): SearchItem => ({
  id,
  kind: "page",
  title,
  terms,
  target: { type: "page", href: id === "home" ? "/en" : `/en/${id}` },
});

const INDEX: SearchItem[] = [
  page("home", "Home"),
  page("career", "Career", ["experience"]),
  { id: "cli", kind: "cli", title: "CLI version", terms: ["terminal"], target: { type: "page", href: "/en/terminal" } },
  { id: "shifts", kind: "project", title: "DoctorX", terms: ["Flutter"], target: { type: "page", href: "/en/projects/shifts" } },
  { id: "acme", kind: "experience", title: "Acme", detail: "Tech Lead", terms: ["Flutter"], target: { type: "page", href: "/en/career/acme" } },
  ...SITE_THEMES.map((theme): SearchItem => ({ id: theme, kind: "theme", title: theme, terms: ["theme"], target: { type: "theme", theme } })),
  { id: "language", kind: "language", title: "Português", lang: "pt-BR", terms: ["language"], target: { type: "language" } },
  { id: "cv", kind: "cv", title: "Download CV", terms: ["PDF"], target: { type: "file", href: "/cv/x.pdf" } },
];

let root: Root;
let container: HTMLDivElement;
let fetchIndex: ReturnType<typeof vi.fn>;

const $ = <T extends Element = HTMLElement>(selector: string) => container.querySelector<T>(selector)!;
const options = () => [...container.querySelectorAll<HTMLElement>("[role=option]")];
const shown = () => options().map((option) => option.dataset.result);
const selected = () => options().find((option) => option.getAttribute("aria-selected") === "true")?.dataset.result;
const status = () => $("[role=status]").textContent;
const input = () => $<HTMLInputElement>("input");
const isOpen = () => container.querySelector("dialog")?.open ?? false;
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
/** The window is another chunk, and its index another request. */
const loaded = async () => {
  await act(async () => void (await import("./search-window")));
  await settle();
};

function shortcut(init: KeyboardEventInit = { ctrlKey: true }) {
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

function type(text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input(), text);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function open() {
  act(() => $("button").focus());
  act(() => $("button").click());
  await loaded();
  expect(isOpen()).toBe(true);
}

beforeEach(async () => {
  vi.resetModules(); // the index of a visit lives in the module
  const proto = HTMLDialogElement.prototype;
  proto.showModal = function () {
    this.open = true;
    this.querySelector<HTMLElement>("button")?.focus();
  };
  proto.close = function () {
    this.open = false;
  };
  Element.prototype.scrollIntoView = () => {};
  fetchIndex = vi.fn(async () => Response.json(INDEX));
  vi.stubGlobal("fetch", fetchIndex);
  push.mockReset();
  sessionStorage.clear();
  document.documentElement.setAttribute("data-site-theme", "dusk");
  document.cookie = "locale=; max-age=0";

  const { SearchButton } = await import("./search-button");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<SearchButton locale="en" labels={chromeLabels(en.site)} />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("opening", () => {
  it("downloads nothing until it opens, and the index once", async () => {
    await settle();
    expect(container.querySelector("dialog")).toBeNull();
    expect(fetchIndex).not.toHaveBeenCalled();

    await open();
    expect(fetchIndex).toHaveBeenCalledTimes(1);
    expect(fetchIndex).toHaveBeenCalledWith("/en/search.json");
    expect(document.activeElement).toBe(input());

    shortcut();
    await open();
    expect(fetchIndex).toHaveBeenCalledTimes(1);
  });

  it("answers ⌘K and Ctrl+K, and not the other keys around them", async () => {
    expect(shortcut({ metaKey: true }).defaultPrevented).toBe(true);
    await loaded();
    expect(isOpen()).toBe(true);
    expect(shortcut({ ctrlKey: true }).defaultPrevented).toBe(true);
    expect(isOpen()).toBe(false);
    for (const init of [{}, { ctrlKey: true, shiftKey: true }, { metaKey: true, altKey: true }]) {
      expect(shortcut(init).defaultPrevented).toBe(false);
    }
    expect(isOpen()).toBe(false);
  });

  it("closes with Esc, gives the focus back, and opens empty the next time", async () => {
    await open();
    type("flutter");
    act(() => {
      $("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));
    });
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe($("button"));
    await open();
    expect(input().value).toBe("");
  });

  it("says when the index did not load, and tries again", async () => {
    fetchIndex.mockImplementationOnce(async () => new Response("", { status: 500 }));
    await open();
    expect(status()).toBe(en.site.search.failed);
    expect(shown()).toEqual([]);
    const retry = [...container.querySelectorAll("button")].find((b) => b.textContent === en.site.search.retry)!;
    act(() => retry.click());
    await settle();
    expect(shown()).toContain("career");
    expect(status()).not.toBe(en.site.search.failed);
  });
});

describe("results", () => {
  it("filter as one types, and the count is announced", async () => {
    await open();
    expect(shown()).toEqual(["home", "career", "cli", "dusk", "light", "dracula", "language", "cv"]);
    expect(status()).toBe("8 results");
    type("flutter");
    expect(shown()).toEqual(["shifts", "acme"]);
    expect(status()).toBe("2 results");
    type("EXPERIÊNCE");
    expect(shown()).toEqual(["career"]);
    expect(status()).toBe("1 result");
  });

  it("belong to the field: the one the arrows are on is its active descendant", async () => {
    await open();
    type("flutter");
    const active = () => document.getElementById(input().getAttribute("aria-activedescendant")!)?.dataset.result;
    expect(document.getElementById(input().getAttribute("aria-controls")!)).toBe($("[role=listbox]"));
    expect(selected()).toBe("shifts");
    key("ArrowDown");
    expect([selected(), active()]).toEqual(["acme", "acme"]);
    key("ArrowDown");
    expect(selected()).toBe("shifts");
    key("ArrowUp");
    expect([selected(), active()]).toEqual(["acme", "acme"]);
    expect(document.activeElement).toBe(input());
    // Typing goes back to the first one.
    type("flutte");
    expect(selected()).toBe("shifts");
  });

  it("are in the language of their names", async () => {
    await open();
    const language = options().find((option) => option.dataset.result === "language")!;
    expect(language.querySelector("[lang]")?.getAttribute("lang")).toBe("pt-BR");
  });
});

describe("choosing", () => {
  it("goes with the keyboard alone", async () => {
    await open();
    type("flutter");
    key("ArrowDown");
    key("Enter");
    expect(push).toHaveBeenCalledWith("/en/career/acme", { scroll: true });
    expect(isOpen()).toBe(false);
  });

  it("leaves the scroll of the home to the home", async () => {
    await open();
    type("home");
    key("Enter");
    expect(push).toHaveBeenCalledWith("/en", { scroll: false });
  });

  it("goes with a click, and takes the CLI version as a page", async () => {
    await open();
    type("terminal");
    act(() => options()[0].click());
    expect(push).toHaveBeenCalledWith("/en/terminal", { scroll: true });
  });

  it("changes the theme without leaving the page", async () => {
    await open();
    type("dracula");
    key("Enter");
    expect(document.documentElement.dataset.siteTheme).toBe("dracula");
    expect(push).not.toHaveBeenCalled();
    expect(isOpen()).toBe(false);
  });

  it("opens the CV in another tab", async () => {
    const opened = vi.spyOn(window, "open").mockReturnValue(null);
    await open();
    type("pdf");
    key("Enter");
    expect(opened).toHaveBeenCalledWith("/cv/x.pdf", "_blank", "noopener");
  });

  it("switches the language with a document load, filters kept", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, search: "?cat=ai", assign });
    await open();
    type("portugues");
    key("Enter");
    expect(assign).toHaveBeenCalledWith("/pt-BR/projects?cat=ai");
    expect(document.cookie).toContain("locale=pt-BR");
    expect(push).not.toHaveBeenCalled();
  });
});

describe("nothing found", () => {
  it("offers the phrase to the assistant, and takes it there outside the address", async () => {
    await open();
    type("  quanto custa um app?  ");
    expect(status()).toBe("Nothing here matches “quanto custa um app?”.");
    expect(shown()).toEqual(["ask"]);
    expect(options()[0].textContent).toBe("Ask the assistant: “quanto custa um app?”");
    expect(selected()).toBe("ask");
    key("Enter");
    expect(push).toHaveBeenCalledWith("/en/terminal?cmd=ask");
    const { takeQuestion } = await import("@/lib/terminal/handoff");
    expect(takeQuestion()).toBe("quanto custa um app?");
    expect(takeQuestion()).toBeNull();
  });
});
