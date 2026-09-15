import { Cascadia_Code } from "next/font/google";
import localFont from "next/font/local";

// Default monospace face (variable font, 200–700). Preloaded.
export const caskaydia = Cascadia_Code({
  variable: "--font-caskaydia",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Alternative face, opt-in via data-font="daddytime". Not preloaded so it is
// only fetched once the visitor actually switches to it. OFL 1.1 — see
// ./fonts/DaddyTimeMono-LICENSE.md.
export const daddytime = localFont({
  src: "./fonts/DaddyTimeMono.otf",
  variable: "--font-daddytime",
  weight: "400",
  display: "swap",
  preload: false,
});

/** Class list that exposes both font variables on <html>. */
export const fontVars = `${caskaydia.variable} ${daddytime.variable}`;
