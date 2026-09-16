import { Cascadia_Code } from "next/font/google";
import localFont from "next/font/local";

// Default monospace face (variable font, 200–700). Preloaded. Only the
// latin subset: every letter the site prints (en, pt-BR accents included)
// lives there. The arrows/bullet (→ ● ↗) are in no subset and fall back;
// the block glyph (█, U+2588) sits in the box-drawing slice that Google
// Fonts ships anyway (U+2500–259F), fetched once on the first `skills` /
// `neofetch` — nothing extra on the LCP path.
export const caskaydia = Cascadia_Code({
  variable: "--font-caskaydia",
  subsets: ["latin"],
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
