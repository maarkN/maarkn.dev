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

/** The pair of chart series: apart for every vision, readable on `--bg-2`. */
const SERIES_DISTANCE: Record<Vision, number> = { normal: 15, protan: 8, deutan: 8, tritan: 8 };
const SERIES_LIGHTNESS: Record<"light" | "dark", [number, number]> = {
  light: [0.43, 0.77],
  dark: [0.48, 0.67],
};
const SERIES_CHROMA = 0.1;

export function auditTheme(theme: SiteTheme, tokens: Tokens, fills: Fills): Measure[] {
  const measures: Measure[] = [];
  const color = (name: string) => {
    if (!tokens[name]) throw new Error(`${theme} has no ${name}`);
    return tokens[name];
  };
  const check = (pair: string, value: number, min: number, max?: number) =>
    measures.push({ theme, pair, value, min, max });
  const text = (ink: string, surface: string, min = TEXT) =>
    check(`${ink} on ${surface}`, contrast(color(ink), color(surface)), min);

  for (const ink of INKS) {
    for (const surface of SURFACES) text(ink, surface);
    text(ink, "--bg-3", LARGE_ON_BG_3.includes(ink) ? LARGE : TEXT);
  }
  // `--on-beam` is written on the gradient of a primary button and on ::selection.
  for (const beam of ["--beam", "--beam-2", "--beam-3"]) text("--on-beam", beam);

  // Text inside a hologram: the fill, a scan line and the pointer light stacked,
  // over each surface a hologram is put on.
  const stack = (surface: string, ...layers: number[]) =>
    layers.reduce((under, layer) => blend(color("--beam"), under, layer), color(surface));
  for (const surface of [...SURFACES, "--bg-3"]) {
    for (const state of ["rest", "dense"] as const) {
      check(
        `--ink on a ${state} hologram, lit, over ${surface}`,
        contrast(color("--ink"), stack(surface, fills[state], fills.scan, fills.light)),
        TEXT,
      );
    }
  }
  // Running text in cards and windows.
  for (const surface of ["--bg", "--bg-2"]) {
    check(
      `--ink-2 on a lit panel over ${surface}`,
      contrast(color("--ink-2"), stack(surface, fills.panelRest, fills.panelScan, fills.panelLight)),
      TEXT,
    );
  }
  // The label of a section tag, the one control whose text is the beam's colour.
  check("--beam on a section tag over --bg", contrast(color("--beam"), stack("--bg", fills.rest, fills.scan)), TEXT);
  // The label of a primary button, over its own light.
  for (const beam of ["--beam", "--beam-2"]) {
    check(
      `--on-beam on a lit primary (${beam})`,
      contrast(color("--on-beam"), blend(color("--beam-3"), color(beam), 0.45)),
      TEXT,
    );
  }

  // The edges of a control, at rest, pressed or focused, and invalid.
  for (const stroke of ["--beam", "--beam-3", "--bad"]) {
    for (const surface of [...SURFACES, "--bg-3"]) {
      check(`${stroke} edge on ${surface}`, contrast(color(stroke), color(surface)), EDGE);
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
