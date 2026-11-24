import localFont from "next/font/local";

/*
 * The proportional faces of the site (docs/design/fundamentos.md). They live
 * apart from fonts.ts on purpose: next/font preloads every face of the module
 * a layout imports, and the CLI version must never download these. The label
 * face is Cascadia Code, shared with the CLI version through `--font-caskaydia`.
 *
 * `adjustFontFallback: false` because next/font measures the default instance
 * of a variable font (Hubot Sans at width 75), not the one the site sets. The
 * metric-matched fallbacks are declared in site.css, next to the families that
 * name them.
 */

/** Titles. One file with the width and weight axes. */
const hubot = localFont({
  src: "./fonts/HubotSans-latin.woff2",
  variable: "--font-hubot",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "font-stretch", value: "75% 125%" }],
});

/** Body, buttons, forms and large numbers. */
const mona = localFont({
  src: "./fonts/MonaSans-latin.woff2",
  variable: "--font-mona",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: false,
});

/** Goes on the same element as `site-root`. */
export const siteFontVars = `${hubot.variable} ${mona.variable}`;
