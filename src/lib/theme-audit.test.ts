import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blend, contrast, distance } from "./contrast";
import { SITE_THEMES } from "./site-theme";
import { readFills, readPalettes } from "./site-tokens";
import { auditTheme, fails, WRITTEN } from "./theme-audit";

const palettes = readPalettes();
const fills = readFills();
const failing = (theme: (typeof SITE_THEMES)[number], change: Record<string, string> = {}) =>
  auditTheme(theme, { ...palettes[theme], ...change }, fills)
    .filter(fails)
    .map(({ pair }) => pair);

describe("contrast", () => {
  it("measures what WCAG does", () => {
    expect(contrast("#000000", "#ffffff")).toBe(21);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrast("#ffffff", "#777777")).toBe(contrast("#777777", "#ffffff"));
    expect(() => contrast("#fff", "#000000")).toThrow();
  });

  it("composites like the browser", () => {
    expect(blend("#ffffff", "#000000", 0.5)).toBe("#808080");
    expect(blend("#8ed6f0", "#27303b", 0)).toBe("#27303b");
    expect(blend("#8ed6f0", "#27303b", 1)).toBe("#8ed6f0");
  });

  it("brings red and green together for who does not see them apart", () => {
    const [red, green] = ["#d62728", "#2ca02c"];
    expect(distance(red, green, "deutan")).toBeLessThan(distance(red, green, "normal"));
    expect(distance(red, red, "protan")).toBe(0);
  });
});

describe("the three themes", () => {
  it("keep every pair in range", () => {
    for (const theme of SITE_THEMES) expect(failing(theme)).toEqual([]);
  });

  it("are refused when a text loses its contrast", () => {
    expect(failing("light", { "--ink-3": "#8f97b3" })).toContain("--ink-3 on --bg");
    expect(failing("dusk", { "--on-beam": "#ffffff" })).toContain("--on-beam on --beam");
    expect(failing("dracula", { "--bad": "#b03030" })).toContain("--bad edge on --bg-3");
  });

  it("are refused when the chart series are too alike, or too faint", () => {
    expect(failing("light", { "--c2": "#5a3fd0" })).toContain("--c1 and --c2 apart, normal vision");
    // Apart in hue, the same to a deuteranope.
    expect(failing("light", { "--c1": "#b5651d", "--c2": "#6b8e23" })).toContain(
      "--c1 and --c2 apart, deutan vision",
    );
    expect(failing("dusk", { "--c1": "#3a4a58" })).toEqual(
      expect.arrayContaining(["--c1 series on --bg-2", "--c1 lightness", "--c1 chroma"]),
    );
  });

  it("are measured in every colour the primitives write or mark with", () => {
    const css = readFileSync("src/components/holo/holo.module.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const surfaces = ["var(--bg-2)", "var(--sunk)"];
    const written = Object.fromEntries(
      [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, selector, declarations]) => {
        const ink =
          declarations.match(/(?:^|[;\s])color:\s*([^;]+)/)?.[1] ??
          declarations.match(/(?:^|[;\s])(?:background|border):\s*(?:\S+ solid )?(var\([^;]+\));/)?.[1];
        return ink && !["inherit", "ButtonText", ...surfaces].includes(ink)
          ? [[selector.trim().replace(/\s+/g, " "), ink]]
          : [];
      }),
    );
    expect(written).toEqual(
      Object.fromEntries(Object.entries(WRITTEN).map(([selector, { ink }]) => [selector, `var(${ink})`])),
    );
  });

  it("are refused when a panel has text in anything but ink", () => {
    const inPanel = (theme: (typeof SITE_THEMES)[number], ink: string) =>
      auditTheme(theme, palettes[theme], fills, { ".text": { ink, on: ["panel"] } })
        .filter(fails)
        .map(({ pair }) => pair);
    expect(inPanel("light", "--beam")).toEqual(["--beam on a lit panel over --bg"]);
    expect(inPanel("light", "--beam-3")).toHaveLength(2);
    expect(inPanel("dracula", "--bad")).toHaveLength(2);
    for (const theme of SITE_THEMES) expect(inPanel(theme, "--ink")).toEqual([]);
  });

  it("are refused when a control inside a panel gets as much beam as one outside", () => {
    const thick = { ...fills, panelScan: fills.scan, panelLight: fills.light };
    expect(auditTheme("dusk", palettes.dusk, thick).filter(fails).map(({ pair }) => pair)).toContain(
      "--ink on a dense hologram, lit, in a lit panel over --bg-2",
    );
  });

  it("are refused when a primary's scan lines swallow its text", () => {
    const scanned = { ...fills, primaryScan: 0.3 };
    expect(auditTheme("dracula", palettes.dracula, scanned).filter(fails).map(({ pair }) => pair)).toContain(
      "--on-beam on a primary (--beam)",
    );
  });

  it("are refused when a hologram's fill swallows its text", () => {
    const dense = { ...fills, dense: 0.75 };
    const pairs = auditTheme("dusk", palettes.dusk, dense).filter(fails).map(({ pair }) => pair);
    expect(pairs).toContain("--ink on a dense hologram, lit, over --bg");

    const lit = { ...fills, panelLight: 0.2 };
    expect(auditTheme("light", palettes.light, lit).filter(fails).map(({ pair }) => pair)).toEqual([
      "--ink-2 on a lit panel over --bg",
      "--ink-2 on a lit panel over --bg-2",
    ]);
  });
});
