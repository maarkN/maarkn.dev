// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSiteTheme, resolveSiteTheme, SITE_THEME_KEY, SITE_THEMES } from "./site-theme";
import { paletteBlocks, readBlocks, readPalettes, type Tokens } from "./site-tokens";
import { themeBootScript } from "./theme-boot";

const root = document.documentElement;

/** The table of docs/design/fundamentos.md: `--c1` / `--c2` share a row. */
function designTable(): Record<string, Tokens> {
  const themes: Record<string, Tokens> = { dusk: {}, light: {}, dracula: {} };
  const columns = Object.keys(themes);
  for (const line of readFileSync("docs/design/fundamentos.md", "utf8").split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    const names = cells[1]?.match(/--[a-z0-9-]+/g);
    if (!names) continue;
    columns.forEach((theme, i) => {
      const values = cells[i + 2]?.match(/#[0-9a-f]{6}/gi) ?? [];
      names.forEach((name, j) => {
        if (values[j]) themes[theme][name] = values[j];
      });
    });
  }
  return themes;
}

/** Runs the boot script the way the parser does, in the global scope. */
function boot() {
  for (const name of root.getAttributeNames()) root.removeAttribute(name);
  (0, eval)(themeBootScript);
}

function system({ light }: { light: boolean }) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query === "(prefers-color-scheme: light)" && light,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  system({ light: false });
});

describe("tokens", () => {
  it("match the table of docs/design/fundamentos.md, theme by theme", () => {
    const table = designTable();
    expect(Object.keys(table.dusk).length).toBe(17);
    expect(readPalettes()).toEqual(table);
  });

  it("repeat the light palette for a visitor without JavaScript whose system is light", () => {
    const block = paletteBlocks().find(({ media }) => media);
    expect(block?.media).toBe("@media (prefers-color-scheme: light)");
    expect(block?.selector).toContain(":root:not([data-site-theme]) .site-root");
    expect(block?.tokens).toEqual(paletteBlocks().find(({ selector }) => selector.includes('"light"'))?.tokens);
  });

  it("only exist where a site screen is: never on the CLI version", () => {
    for (const { selector } of readBlocks()) {
      if (selector.startsWith("@font-face") || selector.includes("view-transition")) continue;
      // Every alternative of every selector needs `.site-root` in the document.
      const inside = selector.startsWith(":is(") ? selector.slice(4, -1).split(", ") : [selector];
      for (const alternative of inside) expect(alternative).toMatch(/\.site-root/);
      expect(selector).not.toMatch(/data-theme\b|data-font/);
    }
  });

  it("leave the CLI version's own tokens as they are", () => {
    const cli = readBlocks(readFileSync("src/app/globals.css", "utf8"));
    const soft = cli.find(({ selector }) => selector === ":root");
    expect(soft?.tokens["--bg"]).toBe("#282A36");
    for (const { selector } of cli) expect(selector).not.toMatch(/data-site-theme|site-root/);
  });
});

describe("resolveSiteTheme", () => {
  it("keeps a known choice, whatever the system prefers", () => {
    for (const theme of SITE_THEMES) {
      expect(resolveSiteTheme(theme, true)).toBe(theme);
      expect(resolveSiteTheme(theme, false)).toBe(theme);
    }
  });

  it("follows the system without a choice, or with one it does not know", () => {
    for (const saved of [null, undefined, "", "soft", "classic", "dark", "DUSK", 1]) {
      expect(isSiteTheme(saved)).toBe(false);
      expect(resolveSiteTheme(saved, true)).toBe("light");
      expect(resolveSiteTheme(saved, false)).toBe("dusk");
    }
  });
});

describe("boot script", () => {
  it("first visit: light when the system prefers light, dusk otherwise", () => {
    system({ light: true });
    boot();
    expect(root.getAttribute("data-site-theme")).toBe("light");
    system({ light: false });
    boot();
    expect(root.getAttribute("data-site-theme")).toBe("dusk");
    // Following the system is not a choice.
    expect(localStorage.getItem(SITE_THEME_KEY)).toBeNull();
  });

  it("saved choice: applied over the system", () => {
    system({ light: true });
    for (const theme of SITE_THEMES) {
      localStorage.setItem(SITE_THEME_KEY, theme);
      boot();
      expect(root.getAttribute("data-site-theme")).toBe(theme);
    }
  });

  it("invalid value: the system, without error and without rewriting it", () => {
    system({ light: true });
    localStorage.setItem(SITE_THEME_KEY, "classic");
    expect(boot).not.toThrow();
    expect(root.getAttribute("data-site-theme")).toBe("light");
    expect(localStorage.getItem(SITE_THEME_KEY)).toBe("classic");
  });

  it("blocked storage: the system, and the CLI version's defaults", () => {
    system({ light: true });
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(boot).not.toThrow();
    expect(root.getAttribute("data-site-theme")).toBe("light");
    expect(root.getAttribute("data-theme")).toBe("soft");
    expect(root.getAttribute("data-font")).toBe("caskaydia");
  });

  it("no matchMedia: dusk", () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    expect(boot).not.toThrow();
    expect(root.getAttribute("data-site-theme")).toBe("dusk");
  });

  it("reads two preferences that do not see each other", () => {
    localStorage.setItem(SITE_THEME_KEY, "light");
    localStorage.setItem("maarkn-theme", "classic");
    localStorage.setItem("maarkn-font", "daddytime");
    boot();
    expect(root.getAttribute("data-site-theme")).toBe("light");
    expect(root.getAttribute("data-theme")).toBe("classic");
    expect(root.getAttribute("data-font")).toBe("daddytime");
    expect(localStorage.getItem(SITE_THEME_KEY)).toBe("light");

    // The CLI version's migration of legacy values does not reach the site's key.
    localStorage.setItem("maarkn-theme", "dev");
    localStorage.setItem(SITE_THEME_KEY, "dracula");
    boot();
    expect(localStorage.getItem("maarkn-theme")).toBe("soft");
    expect(root.getAttribute("data-site-theme")).toBe("dracula");
    expect(localStorage.getItem(SITE_THEME_KEY)).toBe("dracula");
  });

  it("is rendered by the layout as the one inline script, before anything else in <body>", () => {
    const layout = readFileSync("src/app/[lang]/layout.tsx", "utf8");
    const body = layout.slice(layout.indexOf("<body"));
    expect(body.indexOf("themeBootScript")).toBeGreaterThan(0);
    expect(body.indexOf("themeBootScript")).toBeLessThan(body.indexOf("<ThemeProvider>"));
    // next/script's `beforeInteractive` queues inline code for after the first paint.
    expect(layout).not.toMatch(/from "next\/script"/);
    expect(layout.match(/<script\s/g)?.length).toBe(2); // this one and the JSON-LD data
  });
});
