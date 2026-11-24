// @vitest-environment jsdom
import { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_THEME_KEY } from "@/lib/site-theme";
import { ThemeProvider, useTheme, type ThemeApi } from "./theme-provider";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const html = document.documentElement;

let root: Root;
let container: HTMLDivElement;
let site: typeof import("./site-theme");
let cli: ThemeApi;
let shown: string | null;
let systemChanged: (() => void) | null;

function system({ light = false, reduce = false } = {}) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("reduced-motion") ? reduce : query.includes("light") && light,
    addEventListener: (_: string, handler: () => void) => {
      if (query.includes("light")) systemChanged = handler;
    },
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function Probe({ onRead }: { onRead: (cli: ThemeApi, site: string | null) => void }) {
  const palette = useTheme();
  const theme = site.useSiteTheme();
  useLayoutEffect(() => onRead(palette, theme));
  return null;
}

function mount() {
  act(() => {
    root.render(
      <ThemeProvider>
        <site.SiteThemeSync />
        <Probe
          onRead={(palette, theme) => {
            cli = palette;
            shown = theme;
          }}
        />
      </ThemeProvider>,
    );
  });
}

beforeEach(async () => {
  vi.resetModules(); // the choice of a visit lives in the module
  vi.restoreAllMocks();
  localStorage.clear();
  for (const name of html.getAttributeNames()) html.removeAttribute(name);
  html.setAttribute("data-theme", "soft");
  html.setAttribute("data-font", "caskaydia");
  html.setAttribute("data-site-theme", "dusk");
  delete (document as Partial<Document>).startViewTransition;
  system();
  site = await import("./site-theme");
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
});

describe("setSiteTheme", () => {
  it("changes every reader at once and keeps the choice", () => {
    mount();
    expect(shown).toBe("dusk");
    act(() => site.setSiteTheme("dracula"));
    expect(html.getAttribute("data-site-theme")).toBe("dracula");
    expect(shown).toBe("dracula");
    expect(localStorage.getItem(SITE_THEME_KEY)).toBe("dracula");
  });

  it("uses a View Transition where there is one, and skips it under reduced motion", () => {
    const start = vi.fn((update: () => void) => update());
    Object.assign(document, { startViewTransition: start });
    mount();
    act(() => site.setSiteTheme("light"));
    expect(start).toHaveBeenCalledTimes(1);
    expect(shown).toBe("light");

    system({ reduce: true });
    act(() => site.setSiteTheme("dracula"));
    expect(start).toHaveBeenCalledTimes(1);
    expect(shown).toBe("dracula");
  });

  it("works for the visit when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    mount();
    act(() => site.setSiteTheme("dracula"));
    expect(html.getAttribute("data-site-theme")).toBe("dracula");
    // …and a change of system does not undo it.
    system({ light: true });
    act(() => systemChanged?.());
    expect(html.getAttribute("data-site-theme")).toBe("dracula");
  });
});

describe("SiteThemeSync", () => {
  it("puts the attribute back when a client navigation replaced <html>", () => {
    localStorage.setItem(SITE_THEME_KEY, "dracula");
    html.removeAttribute("data-site-theme");
    mount();
    expect(html.getAttribute("data-site-theme")).toBe("dracula");
  });

  it("follows the system only while there is no choice", () => {
    mount();
    const change = (light: boolean) => {
      // The listener holds its own media object; answer through it.
      (window.matchMedia as ReturnType<typeof vi.fn>).mock.results
        .map((result) => result.value as { matches: boolean })
        .forEach((media) => (media.matches = light));
      act(() => systemChanged?.());
    };
    change(true);
    expect(shown).toBe("light");
    change(false);
    expect(shown).toBe("dusk");

    act(() => site.setSiteTheme("dracula"));
    change(true);
    expect(shown).toBe("dracula");
  });
});

describe("site and CLI version", () => {
  it("changing the site's theme leaves the CLI version alone", () => {
    localStorage.setItem("maarkn-theme", "classic");
    html.setAttribute("data-theme", "classic");
    mount();
    for (const theme of ["light", "dracula", "dusk"] as const) {
      act(() => site.setSiteTheme(theme));
      expect(html.getAttribute("data-theme")).toBe("classic");
      expect(html.getAttribute("data-font")).toBe("caskaydia");
      expect(cli.theme).toBe("classic");
      expect(localStorage.getItem("maarkn-theme")).toBe("classic");
    }
  });

  it("changing the CLI version's palette and font leaves the site alone", () => {
    mount();
    act(() => site.setSiteTheme("light"));
    act(() => cli.setTheme("classic"));
    act(() => cli.setFont("daddytime"));
    expect(html.getAttribute("data-theme")).toBe("classic");
    expect(html.getAttribute("data-site-theme")).toBe("light");
    expect(shown).toBe("light");
    expect(localStorage.getItem(SITE_THEME_KEY)).toBe("light");
  });
});
