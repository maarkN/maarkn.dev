// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { SITE_THEMES } from "@/lib/site-theme";
import { BaseMenu } from "./base-menu";
import { chromeLabels } from "./labels";
import { SiteFooter } from "./site-footer";
import { SiteTop } from "./site-top";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let pathname = "/en";
let query = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(query),
}));

const LABELS = { en: chromeLabels(en.site), "pt-BR": chromeLabels(ptBR.site as typeof en.site) };

let root: Root;
let container: HTMLDivElement;

const $ = <T extends Element = HTMLElement>(selector: string) => container.querySelector<T>(selector)!;
const $$ = (selector: string) => [...container.querySelectorAll<HTMLElement>(selector)];
const nameOf = (element: Element) => element.getAttribute("aria-label") ?? element.textContent!.trim();

const render = (node: ReactNode) => act(() => root.render(node));
const top = (locale: "en" | "pt-BR" = "en", available = true) =>
  render(<SiteTop locale={locale} labels={LABELS[locale]} available={available} />);
const menu = (locale: "en" | "pt-BR" = "en") => render(<BaseMenu locale={locale} labels={LABELS[locale]} />);

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  pathname = "/en";
  query = "";
  localStorage.clear();
  document.cookie = "locale=; max-age=0";
  document.documentElement.setAttribute("data-site-theme", "dusk");
  window.history.replaceState(null, "", "/en");
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

/** A click the test page itself does not follow. */
function click(element: Element, init: MouseEventInit = {}) {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, ...init });
  let prevented = false;
  const stop = (e: Event) => {
    prevented = e.defaultPrevented;
    e.preventDefault();
  };
  window.addEventListener("click", stop, { once: true });
  act(() => {
    element.dispatchEvent(event);
  });
  return prevented;
}

describe("top", () => {
  it("has brand, pages, search, language, theme, CLI version and contact, in this order", () => {
    top();
    expect($$("header a[href], header button").map(nameOf)).toEqual([
      "maarkn.dev, home",
      "Career",
      "Projects",
      "Notes",
      "Search",
      "PT: switch to Portuguese",
      "Soft dark",
      "Soft light",
      "Dracula",
      "Theme: Soft dark. Switch to Soft light",
      "CLI version",
      "Talk to me",
    ]);
    expect(nameOf($("header nav"))).toBe("Pages");
    expect($$("header a").map((a) => a.getAttribute("href"))).toEqual([
      "/en",
      "/en/career",
      "/en/projects",
      "/en/blog",
      "/pt-BR",
      "/en/terminal",
      "/en#contact",
    ]);
  });

  it("marks the page the visitor is on, for screen readers too", () => {
    pathname = "/en/projects";
    top();
    expect($$("header [aria-current]").map(nameOf)).toEqual(["Projects"]);
    expect($("header [aria-current]").getAttribute("aria-current")).toBe("page");

    pathname = "/en/projects/some-slug";
    top();
    expect($$("header [aria-current]").map(nameOf)).toEqual(["Projects"]);
    expect($("header [aria-current]").getAttribute("aria-current")).toBe("true");

    pathname = "/en";
    top();
    expect($$("header [aria-current]").map(nameOf)).toEqual(["maarkn.dev, home"]);
  });

  it("is in the language of the page", () => {
    pathname = "/pt-BR/career";
    top("pt-BR");
    expect($$("header nav a").map(nameOf)).toEqual(["Carreira", "Projetos", "Notas"]);
    expect($('a[hreflang="en"]').getAttribute("aria-label")).toBe("EN: mudar para inglês");
    expect($('a[hreflang="en"]').textContent).toBe("EN");
  });

  it("shows availability only while there is any, and the time in Goiânia", () => {
    top();
    const clock = /Goiânia (\d\d:\d\d) UTC−3/;
    expect($("header p").textContent).toMatch(/^open to senior roles · Goiânia/);
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    expect(clock.exec($("header p").textContent!)![1]).toBe(time);
    top("en", false);
    expect($("header p").textContent).toMatch(/^Goiânia/);
  });

  it("arrives from the server with every link, and without a time or a theme to guess", () => {
    const html = renderToString(<SiteTop locale="en" labels={LABELS.en} available />);
    expect(html).toContain('href="/en/projects"');
    expect(html).toContain('href="/pt-BR"');
    expect(html).toContain("--:--");
    expect(html).not.toContain('aria-pressed="true"');
  });
});

describe("language", () => {
  it("goes to the same page in the other language, and remembers the choice", () => {
    pathname = "/pt-BR/projects/some-slug";
    top("pt-BR");
    const link = $<HTMLAnchorElement>('a[hreflang="en"]');
    expect(link.getAttribute("href")).toBe("/en/projects/some-slug");
    // Left to the browser: a document load, not a client navigation.
    expect(click(link)).toBe(false);
    expect(document.cookie).toContain("locale=en");
  });

  it("keeps the filter and the search of the address", () => {
    pathname = "/en/projects";
    query = "cat=ai&q=caf%C3%A9+gelado";
    top();
    const href = new URL($<HTMLAnchorElement>('a[hreflang="pt-BR"]').href);
    expect(href.pathname).toBe("/pt-BR/projects");
    expect(href.searchParams.get("cat")).toBe("ai");
    expect(href.searchParams.get("q")).toBe("café gelado");
  });
});

describe("theme", () => {
  it("is chosen by its swatch, which then shows as the one in use", () => {
    top();
    const pressed = () => $$("[data-theme-option][aria-pressed='true']").map((b) => b.dataset.themeOption);
    expect(pressed()).toEqual(["dusk"]);
    act(() => $("[data-theme-option=dracula]").click());
    expect(document.documentElement.dataset.siteTheme).toBe("dracula");
    expect(pressed()).toEqual(["dracula"]);
  });

  it("goes round the three with the single button, which says where it goes", () => {
    top();
    const seen = SITE_THEMES.map(() => {
      act(() => $("[data-theme-next]").click());
      return document.documentElement.dataset.siteTheme;
    });
    expect(seen).toEqual(["light", "dracula", "dusk"]);
    expect(nameOf($("[data-theme-next]"))).toBe("Theme: Soft dark. Switch to Soft light");
  });
});

describe("brand", () => {
  it("goes home from another page, and to the top from the home", () => {
    pathname = "/en/projects";
    top();
    click($("header a"), { metaKey: true });
    expect(window.scrollTo).not.toHaveBeenCalled();

    pathname = "/en";
    top();
    window.history.replaceState(null, "", "/en#contact");
    expect(click($("header a"))).toBe(true);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(window.location.hash).toBe("");
    // A new tab is the browser's.
    expect(click($("header a"), { ctrlKey: true })).toBe(false);
  });
});

describe("menu at the base", () => {
  const details = () => $<HTMLDetailsElement>("details");

  it("lists pages and sections, and says where the visitor is", () => {
    pathname = "/pt-BR/projects";
    menu("pt-BR");
    expect($$("details a").map(nameOf)).toEqual(["Início", "Carreira", "Projetos", "Notas", "Links", "Contato"]);
    expect($$("details [aria-current]").map(nameOf)).toEqual(["Projetos"]);
    expect($("summary").textContent).toBe("MenuProjetos");
    expect(nameOf($("nav"))).toBe("Menu");
  });

  it("closes with Esc, giving the focus back", () => {
    menu();
    details().open = true;
    $<HTMLAnchorElement>("details a").focus();
    act(() => {
      $("details a").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(details().open).toBe(false);
    expect(document.activeElement).toBe($("summary"));
  });

  it("closes when the page changes, on a tap outside, and when the focus leaves", () => {
    const outside = document.body.appendChild(document.createElement("button"));
    menu();
    details().open = true;
    pathname = "/en/career";
    menu();
    expect(details().open).toBe(false);

    details().open = true;
    act(() => {
      $("details a").dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(details().open).toBe(true);
    act(() => {
      outside.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(details().open).toBe(false);

    details().open = true;
    $<HTMLAnchorElement>("details a").focus();
    act(() => outside.focus());
    expect(details().open).toBe(false);
    outside.remove();
  });
});

describe("foot", () => {
  it("has the pages, the CLI version and the contact, where #contact lands", () => {
    pathname = "/en/links";
    render(<SiteFooter locale="en" labels={LABELS.en} channels={en.links.links} />);
    expect($$("footer nav a").map(nameOf)).toEqual(["Home", "Career", "Projects", "Notes", "Links", ">_CLI version"]);
    expect($('footer a[href="/en/terminal"]')).not.toBeNull();
    expect($$("footer [aria-current]").map(nameOf)).toEqual(["Links"]);
    const contact = $("#contact");
    expect($(`#${contact.getAttribute("aria-labelledby")}`).textContent).toBe("Contact");
    expect([...contact.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      "mailto:contact@maarkn.dev",
      "https://linkedin.com/in/maarkn",
      "https://github.com/maarkn",
      "https://wa.me/5562981736748",
      "/cv/marco-filho.pdf",
    ]);
  });
});
