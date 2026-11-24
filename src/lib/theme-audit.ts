import { blend, contrast, distance, lightnessAndChroma, type Vision } from "./contrast";
import type { SiteTheme } from "./site-theme";
import type { Fills, Tokens } from "./site-tokens";

/**
 * Every pair of the site's themes that has a minimum, measured
 * (docs/design/fundamentos.md). Run by scripts/check-contrast.ts.
 */

export type Measure = {
  theme: SiteTheme;
  /** What is being read or seen, and over what. */
  pair: string;
  value: number;
  min: number;
  /** Set when the value also has a ceiling (the lightness band of a series). */
  max?: number;
};

const TEXT = 4.5;
const LARGE = 3;
const EDGE = 3;

const INKS = ["--ink", "--ink-2", "--ink-3", "--beam", "--beam-2", "--beam-3", "--ok", "--warn", "--bad"];
const SURFACES = ["--bg", "--bg-2", "--sunk"];

/**
 * On `--bg-3`, the surface of what is in focus, these four do not reach 4.5:1
 * in every theme: they are for text from 18px bold up, icons and borders there.
 */
const LARGE_ON_BG_3 = ["--ink-3", "--beam", "--beam-2", "--bad"];

/**
 * Where the primitives write. A control goes on any surface and inside a panel;
 * a panel (card, window) on the page or on a surface; a section tag, on the page.
 */
type Place = "page" | "panel" | "control" | "primary" | "tag" | "field" | "notice";

/** What is under a text: how to call it, and its colour. */
type Under = [name: string, hex: string];

/**
 * Every colour src/components/holo/holo.module.css writes with, or fills a mark
 * with, and what is under it. theme-audit.test.ts compares the list with the
 * stylesheet, so a colour that is not measured does not get in. Text needs
 * 4.5:1; an icon or a mark, 3:1.
 */
export const WRITTEN: Record<string, { ink: string; on: Place[]; icon?: true }> = {
  ".control": { ink: "--ink", on: ["control"] },
  ".primary": { ink: "--on-beam", on: ["primary"] },
  ".beam": { ink: "--beam", on: ["page", "notice"] },
  ".beam:focus-visible": { ink: "--beam-3", on: ["page", "notice"] },
  ".beam:active": { ink: "--beam-3", on: ["page", "notice"] },
  ".panel .beam": { ink: "--ink", on: ["panel"] },
  ".tagSection": { ink: "--beam", on: ["tag"] },
  ".tagSection[aria-current]": { ink: "--ink", on: ["control"] },
  ".tagSection:hover": { ink: "--ink", on: ["control"] },
  ".dialog": { ink: "--ink", on: ["panel"] },
  ".fieldLabel": { ink: "--ink", on: ["page", "panel"] },
  ".fieldHint": { ink: "--ink-2", on: ["page", "panel"] },
  ".fieldError": { ink: "--bad", on: ["page"] },
  ".panel .fieldError": { ink: "--ink", on: ["panel"] },
  ".panel .fieldError svg": { ink: "--bad", on: ["panel"], icon: true },
  ".input": { ink: "--ink", on: ["field"] },
  ".input::placeholder": { ink: "--ink-2", on: ["field"] },
  ".switch": { ink: "--ink", on: ["page", "panel"] },
  ".thumb": { ink: "--ink", on: ["control"], icon: true },
  '.switch[aria-checked="true"] .thumb': { ink: "--ink", on: ["control"], icon: true },
  ".notice": { ink: "--ink", on: ["notice"] },
  ".notice::before": { ink: "--tone", on: ["notice"], icon: true },
  ".notice > svg": { ink: "--tone", on: ["notice"], icon: true },
  ".noticeText p:not(.noticeTitle)": { ink: "--ink-2", on: ["notice"] },
};

/** What `--tone` may be in a notice. */
const TONES = ["--beam", "--ok", "--warn", "--bad"];

/** The pair of chart series: apart for every vision, readable on `--bg-2`. */
const SERIES_DISTANCE: Record<Vision, number> = { normal: 15, protan: 8, deutan: 8, tritan: 8 };
const SERIES_LIGHTNESS: Record<"light" | "dark", [number, number]> = {
  light: [0.43, 0.77],
  dark: [0.48, 0.67],
};
const SERIES_CHROMA = 0.1;

export function auditTheme(theme: SiteTheme, tokens: Tokens, fills: Fills, written = WRITTEN): Measure[] {
  const measures: Measure[] = [];
  const color = (name: string) => {
    if (!tokens[name]) throw new Error(`${theme} has no ${name}`);
    return tokens[name];
  };
  const seen = new Set<string>();
  const check = (pair: string, value: number, min: number, max?: number) => {
    if (!seen.has(pair)) measures.push({ theme, pair, value, min, max });
    seen.add(pair);
  };
  const text = (ink: string, surface: string, min = TEXT) =>
    check(`${ink} on ${surface}`, contrast(color(ink), color(surface)), min);

  for (const ink of INKS) {
    for (const surface of SURFACES) text(ink, surface);
    text(ink, "--bg-3", LARGE_ON_BG_3.includes(ink) ? LARGE : TEXT);
  }
  // `--on-beam` is written on the gradient of a primary button and on ::selection.
  for (const beam of ["--beam", "--beam-2", "--beam-3"]) text("--on-beam", beam);

  // What is under the text of each place. Every layer of beam brings it closer
  // to the text, so the worst is all of them at once: fill, scan line and light.
  const stack = (under: string, ...layers: number[]) =>
    layers.reduce((hex, layer) => blend(color("--beam"), hex, layer), under);
  const surfaces = (...names: string[]) => names.map((name): Under => [name, color(name)]);
  const panels = surfaces("--bg", "--bg-2").map(([name, hex]): Under => [
    `a lit panel over ${name}`,
    stack(hex, fills.panelRest, fills.panelScan, fills.panelLight),
  ]);
  const controls = (["rest", "dense"] as const).flatMap((state) => [
    ...surfaces(...SURFACES, "--bg-3").map(([name, hex]): Under => [
      `a ${state} hologram, lit, over ${name}`,
      stack(hex, fills[state], fills.scan, fills.light),
    ]),
    ...panels.map(([name, hex]): Under => [
      `a ${state} hologram, lit, in ${name}`,
      stack(hex, fills[state], fills.panelScan, fills.panelLight),
    ]),
  ]);
  // The light of a primary is another colour, and may help: with it and without.
  const primaries = surfaces("--beam", "--beam-2").flatMap(([name, hex]) =>
    ([["", 0], ["selected ", fills.primaryDense]] as const).flatMap(([state, dense]): Under[] => {
      const scanned = blend(color("--on-beam"), blend(color("--ink"), hex, dense), fills.primaryScan);
      return [
        [`a ${state}primary (${name})`, scanned],
        [`a ${state}primary, lit (${name})`, blend(color("--beam-3"), scanned, fills.primaryLight)],
      ];
    }),
  );
  const places: Record<Place, Under[]> = {
    page: surfaces(...SURFACES),
    panel: panels,
    control: controls,
    primary: primaries,
    tag: [["a section tag over --bg", stack(color("--bg"), fills.rest, fills.scan)]],
    field: surfaces("--sunk"),
    notice: surfaces("--bg-2"),
  };
  for (const { ink, on, icon } of Object.values(written)) {
    for (const name of ink === "--tone" ? TONES : [ink]) {
      for (const [under, hex] of on.flatMap((place) => places[place])) {
        check(`${name}${icon ? " icon" : ""} on ${under}`, contrast(color(name), hex), icon ? EDGE : TEXT);
      }
    }
  }
  // Running text in cards and windows.
  for (const [under, hex] of panels) check(`--ink-2 on ${under}`, contrast(color("--ink-2"), hex), TEXT);

  // The edges of a control, at rest, pressed or focused, and invalid, and the
  // beam under a link.
  for (const stroke of ["--beam", "--beam-3", "--bad"]) {
    for (const [under, hex] of [...surfaces(...SURFACES, "--bg-3"), ...panels]) {
      check(`${stroke} edge on ${under}`, contrast(color(stroke), hex), EDGE);
    }
  }

  const [c1, c2] = [color("--c1"), color("--c2")];
  for (const [name, hex] of [["--c1", c1], ["--c2", c2]] as const) {
    check(`${name} series on --bg-2`, contrast(hex, color("--bg-2")), EDGE);
    const { lightness, chroma } = lightnessAndChroma(hex);
    const [low, high] = SERIES_LIGHTNESS[theme === "light" ? "light" : "dark"];
    check(`${name} lightness`, lightness, low, high);
    check(`${name} chroma`, chroma, SERIES_CHROMA);
  }
  for (const [vision, min] of Object.entries(SERIES_DISTANCE) as [Vision, number][]) {
    check(`--c1 and --c2 apart, ${vision} vision`, distance(c1, c2, vision), min);
  }
  return measures;
}

export const fails = ({ value, min, max }: Measure) => value < min || (max !== undefined && value > max);
