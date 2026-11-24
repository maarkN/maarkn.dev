import localFont from "next/font/local";

// Cascadia Code (variable, 200–700), preloaded: the default face of the CLI
// version and the label face of the site, so the one file serves both. Latin
// only: every letter printed here (en, pt-BR accents included) lives there.
// The arrows/bullet (→ ● ↗) are in no slice and fall back; the block glyph
// (█, U+2588) sits in the box-drawing slice declared in globals.css, fetched
// once on the first `skills` / `neofetch` — nothing extra on the LCP path.
// OFL 1.1 — see ./fonts/CascadiaCode-LICENSE.md.
export const caskaydia = localFont({
  src: "./fonts/CascadiaCode-latin.woff2",
  variable: "--font-caskaydia",
  weight: "200 700",
  display: "swap",
  // next/font can only size-adjust Arial/Times, which are proportional: text
  // set in them wraps differently and shifts on swap. globals.css declares a
  // metric-matched monospace fallback ("Cascadia Code Fallback") instead.
  adjustFontFallback: false,
});

// Alternative face, opt-in via data-font="daddytime". Not preloaded so it is
// only fetched once the visitor actually switches to it. OFL 1.1 — see
// ./fonts/DaddyTimeMono-LICENSE.md.
const daddytime = localFont({
  src: "./fonts/DaddyTimeMono.otf",
  variable: "--font-daddytime",
  weight: "400",
  display: "swap",
  preload: false,
});

/** Class list that exposes both font variables on <html>. */
export const fontVars = `${caskaydia.variable} ${daddytime.variable}`;
