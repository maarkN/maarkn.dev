// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AdminLocale } from "@/lib/admin/locale";
import { NAV, NAV_ITEMS } from "@/lib/admin/nav";
import { SITE_THEME_KEY } from "@/lib/site-theme";
import { shellLabels } from "./labels";
import { Shell } from "./shell";
import { initials } from "./account-menu";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let pathname = "/admin";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }) }));
const logoutAction = vi.fn();
vi.mock("@/app/_actions/auth", () => ({ logoutAction: () => logoutAction() }));
const changeLanguage = vi.fn();
vi.mock("./change-language", () => ({ changeLanguage: (locale: string) => changeLanguage(locale) }));
vi.mock("@/app/_actions/search", () => ({ listSearchableApplications: vi.fn() }));

const LABELS = { en: shellLabels(en.admin), "pt-BR": shellLabels(ptBR.admin) };
const EMAIL = "marco.filho@example.com";

let root: Root;
let container: HTMLDivElement;
let wide: boolean;

const $ = <T extends Element = HTMLElement>(selector: string) => container.querySelector<T>(selector)!;
const $$ = (selector: string) => [...container.querySelectorAll<HTMLElement>(selector)];
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

const shell = ({ locale = "pt-BR", collapsed = false, name, children }: {
  locale?: AdminLocale;
  collapsed?: boolean;
  name?: string;
  children?: ReactNode;
} = {}) => (
  <TooltipProvider>
    <Shell email={EMAIL} name={name} locale={locale} labels={LABELS[locale]} collapsed={collapsed}>
      {children ?? <p>conteúdo</p>}
    </Shell>
  </TooltipProvider>
);
const render = (options?: Parameters<typeof shell>[0]) => act(() => root.render(shell(options)));

/** What a screen reader gets: without what is hidden from it. */
function spoken(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll("[aria-hidden='true']").forEach((node) => node.remove());
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

const press = (target: Element, key: string) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
  });

beforeEach(() => {
  wide = true;
  pathname = "/admin";
  document.cookie = "admin-menu=; path=/admin; max-age=0";
  window.history.replaceState(null, "", "/admin");
  localStorage.clear();
  document.documentElement.setAttribute("data-site-theme", "dusk");
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("1360px") && wide,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  // Radix asks the layout, which jsdom does not have.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = () => false;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  for (const mock of [logoutAction, changeLanguage]) mock.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  vi.resetModules();
});

describe("menu", () => {
  const menu = () => $("aside nav");

  it("is in four groups, each under its name", () => {
    render();
    expect(menu().getAttribute("aria-label")).toBe("Menu do backoffice");
    const groups = [...menu().querySelectorAll("section")];
    expect(groups.map((group) => document.getElementById(group.getAttribute("aria-labelledby")!)!.textContent)).toEqual([
      "Painel",
      "Carreira",
      "Site",
      "Sistema",
    ]);
    expect(groups.map((group) => group.querySelectorAll("li").length)).toEqual(NAV.map(({ items }) => items.length));
    expect([...menu().querySelectorAll("a")].map(spoken)).toEqual(
      NAV_ITEMS.filter(({ href }) => href).map(({ key }) => ptBR.admin.nav.items[key]),
    );
  });

  it("marks the current screen, and only one", () => {
    for (const [path, name] of [
      ["/admin", "Visão geral"],
      ["/admin/applications/board", "Candidaturas"],
      ["/admin/api-keys", "MCP e chaves"],
    ]) {
      pathname = path;
      render();
      const current = [...menu().querySelectorAll("[aria-current]")];
      expect(current.map(spoken), path).toEqual([name]);
      expect(current[0].getAttribute("aria-current")).toBe("page");
    }
    pathname = "/admin/nowhere";
    render();
    expect(menu().querySelector("[aria-current]")).toBeNull();
  });

  it("says 'em breve' of what is not built: no link, no focus", () => {
    render();
    const soon = [...menu().querySelectorAll("li > span")];
    expect(soon.map(spoken)).toEqual(["Agenda em breve", "Experiências em breve", "Notas em breve"]);
    for (const entry of soon) {
      expect(entry.tagName).toBe("SPAN");
      expect(entry.getAttribute("href")).toBeNull();
      expect((entry as HTMLElement).tabIndex).toBe(-1);
      expect(entry.querySelector("a, button, [tabindex]")).toBeNull();
    }
  });

  it("collapses, keeps every name, and stays collapsed in the next screens", () => {
    render();
    const toggle = () => $("aside button[aria-controls]");
    expect(toggle().getAttribute("aria-label")).toBe("Recolher o menu");
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(toggle().getAttribute("aria-controls")!)).toBe(menu());

    act(() => toggle().click());
    expect($("[data-menu=collapsed]")).not.toBeNull();
    expect(toggle().getAttribute("aria-label")).toBe("Expandir o menu");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect([...menu().querySelectorAll("a")].every((link) => spoken(link).length > 3)).toBe(true);
    expect(document.cookie).toContain("admin-menu=collapsed");

    // A screen the browser kept from before: the server had drawn it open.
    render({ collapsed: false });
    expect($("[data-menu=collapsed]")).not.toBeNull();
    act(() => toggle().click());
    expect(container.querySelector("[data-menu]")).toBeNull();
    expect(document.cookie).toContain("admin-menu=open");
  });

  it("arrives from the server as it was left", () => {
    expect(renderToString(shell({ collapsed: true }))).toContain('data-menu="collapsed"');
    expect(renderToString(shell())).not.toContain("data-menu");
  });

  it("collapsed, shows the name to the focus and to the pointer; open, it has no tip", async () => {
    wide = false;
    render();
    const jobs = $<HTMLAnchorElement>('aside a[href="/admin/jobs"]');
    const tip = () => document.querySelector('[data-slot="tooltip-content"]')?.firstChild?.textContent ?? null;
    act(() => jobs.focus());
    await settle();
    expect(tip()).toBe("Vagas");
    // The name is already the link's: the tip must not be read a second time.
    expect(jobs.getAttribute("aria-describedby")).toBeNull();
    act(() => jobs.blur());
    await settle();
    expect(tip()).toBeNull();

    act(() => {
      jobs.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));
    });
    await settle();
    expect(tip()).toBe("Vagas");
    act(() => {
      jobs.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, pointerType: "mouse" }));
    });

    wide = true;
    render();
    act(() => $<HTMLAnchorElement>('aside a[href="/admin/contacts"]').focus());
    await settle();
    expect(tip()).toBeNull();
  });
});

describe("phone", () => {
  const bar = () => $('nav[aria-label="Atalhos"]');

  it("has the four main screens and 'Mais', with the current one marked", () => {
    pathname = "/admin/jobs";
    render();
    expect([...bar().querySelectorAll("a, button")].map(spoken)).toEqual([
      "Visão geral",
      "Candidaturas",
      "Vagas",
      "Contatos",
      "Mais",
    ]);
    expect([...bar().querySelectorAll("[aria-current]")].map(spoken)).toEqual(["Vagas"]);
    pathname = "/admin/settings";
    render();
    expect([...bar().querySelectorAll("[aria-current]")].map(spoken)).toEqual(["Mais"]);
  });

  it("opens every screen under 'Mais', and closes when one is chosen or with Esc", () => {
    render();
    const more = $("[data-more]");
    act(() => {
      more.focus();
      more.click();
    });
    const dialog = $<HTMLDialogElement>("dialog[open]");
    expect(dialog.querySelectorAll("a")).toHaveLength(NAV_ITEMS.filter(({ href }) => href).length);
    expect([...dialog.querySelectorAll("li > span")].map(spoken)).toContain("Agenda em breve");

    act(() => {
      dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    });
    expect(container.querySelector("dialog[open]")).toBeNull();
    expect(document.activeElement).toBe(more);

    act(() => more.click());
    const link = $<HTMLAnchorElement>('dialog a[href="/admin/audit"]');
    link.addEventListener("click", (event) => event.preventDefault());
    act(() => link.click());
    expect(container.querySelector("dialog[open]")).toBeNull();
  });
});

describe("create", () => {
  const items = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];

  async function open() {
    const trigger = $("[data-create]");
    act(() => trigger.focus());
    press(trigger, "Enter");
    await settle();
    return trigger;
  }

  it("opens with the keyboard and offers what can be created; the appointment is 'em breve'", async () => {
    render();
    expect(spoken($("[data-create]"))).toBe("Criar");
    await open();
    expect(items().map(spoken)).toEqual(["Candidatura", "Compromisso em breve", "Projeto", "Currículo"]);
    expect(items().map((item) => item.getAttribute("href"))).toEqual([
      "/admin/applications/new",
      null,
      "/admin/projects/new",
      "/admin/generator",
    ]);
    expect(items()[1].getAttribute("aria-disabled")).toBe("true");
  });

  it("walks with the arrows over what exists, and gives the focus back on Esc", async () => {
    render();
    const trigger = await open();
    const focused = () => spoken(document.activeElement!);
    expect(focused()).toBe("Candidatura");
    press(document.activeElement!, "ArrowDown");
    await settle();
    expect(focused()).toBe("Projeto");
    press(document.activeElement!, "End");
    await settle();
    expect(focused()).toBe("Currículo");
    press(document.activeElement!, "Escape");
    await settle();
    expect(items()).toEqual([]);
    expect(document.activeElement).toBe(trigger);
  });
});

describe("account", () => {
  async function open(locale: AdminLocale = "pt-BR") {
    render({ locale });
    const trigger = $("aside [data-account]");
    act(() => trigger.focus());
    press(trigger, "Enter");
    await settle();
    return trigger;
  }
  const radios = () => [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
  const radio = (name: string) => radios().find((item) => spoken(item) === name)!;
  const checked = () => radios().filter((item) => item.getAttribute("aria-checked") === "true").map(spoken);

  it("has the theme, the language, the settings, the site and the way out", async () => {
    const trigger = await open();
    expect(trigger.getAttribute("aria-label")).toBe("MF: menu da conta");
    expect(radios().map(spoken)).toEqual(["Escuro suave", "Claro suave", "Dracula", "Português", "English"]);
    expect([...document.querySelectorAll('[role="menuitem"]')].map(spoken)).toEqual(["Configurações", "Ver o site", "Sair"]);
    expect([...document.querySelectorAll('[role="menuitem"]')].map((item) => item.getAttribute("href"))).toEqual([
      "/admin/settings",
      "/",
      null,
    ]);
    expect(checked()).toEqual(["Escuro suave", "Português"]);
  });

  it("changes the theme of the site itself, with the menu still open", async () => {
    await open();
    act(() => radio("Claro suave").focus());
    press(radio("Claro suave"), "Enter");
    await settle();
    expect(document.documentElement.dataset.siteTheme).toBe("light");
    expect(localStorage.getItem(SITE_THEME_KEY)).toBe("light");
    expect(checked()).toEqual(["Claro suave", "Português"]);
  });

  it("changes the language, and does nothing for the one it is already in", async () => {
    await open();
    press(radio("English"), "Enter");
    await settle();
    expect(changeLanguage.mock.calls).toEqual([["en"]]);
    expect(radios()).toEqual([]);

    await open();
    press(radio("Português"), "Enter");
    await settle();
    expect(changeLanguage).toHaveBeenCalledTimes(1);
  });

  it("signs out", async () => {
    await open();
    const out = document.querySelector<HTMLElement>("[data-sign-out]")!;
    act(() => out.focus());
    press(out, "Enter");
    await settle();
    expect(logoutAction).toHaveBeenCalledTimes(1);
  });

  it("closes with Esc and gives the focus back", async () => {
    const trigger = await open();
    press(document.activeElement!, "Escape");
    await settle();
    expect(radios()).toEqual([]);
    expect(document.activeElement).toBe(trigger);
  });

  it("shows two letters of whoever it is", () => {
    expect(initials("marco.filho@example.com")).toBe("MF");
    expect(initials("ana@example.com")).toBe("AN");
    expect(initials("a11y-audit@local.test")).toBe("AA");
    expect(initials("admin")).toBe("AD");
    expect(initials("")).toBe("");
  });
});

describe("the way back", () => {
  it("is the trail of a screen inside another; a screen of the menu has none", () => {
    pathname = "/admin/applications/clx1/edit";
    render({ name: "Orbita Labs" });
    const trail = $('nav[aria-label="Caminho desta tela"]');
    expect([...trail.querySelectorAll("li")].map(spoken)).toEqual(["Candidaturas", "Orbita Labs", "Editar"]);
    expect([...trail.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual([
      "/admin/applications",
      "/admin/applications/clx1",
    ]);
    expect(spoken(trail.querySelector("[aria-current=page]")!)).toBe("Editar");

    pathname = "/admin/applications";
    render();
    expect(container.querySelector('nav[aria-label="Caminho desta tela"]')).toBeNull();
  });
});

describe("the whole", () => {
  it("has a skip link, first of all, that moves the focus to the screen", () => {
    render();
    const first = $<HTMLAnchorElement>("a, button");
    expect(first.textContent).toBe("Pular para o conteúdo");
    const main = $("main");
    expect(first.getAttribute("href")).toBe(`#${main.id}`);
    expect(main.tabIndex).toBe(-1);
  });

  it("is in the language of the backoffice, with the same addresses", () => {
    render({ locale: "pt-BR" });
    const addresses = () => $$("a[href]").map((link) => link.getAttribute("href"));
    const before = addresses();
    render({ locale: "en" });
    expect(addresses()).toEqual(before);
    expect($$("aside nav a").map(spoken)).toEqual(
      NAV_ITEMS.filter(({ href }) => href).map(({ key }) => en.admin.nav.items[key]),
    );
    const portuguese = Object.values(ptBR.admin.nav.items).filter(
      (name) => !(Object.values(en.admin.nav.items) as string[]).includes(name),
    );
    for (const name of portuguese) expect(container.textContent).not.toContain(name);
  });

  it("gives everything that can be focused a name", () => {
    render();
    for (const element of $$("a[href], button")) {
      expect(element.getAttribute("aria-label") || spoken(element), element.outerHTML.slice(0, 120)).toBeTruthy();
    }
  });
});
