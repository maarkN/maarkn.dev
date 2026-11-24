/**
 * The site's theme (docs/design/fundamentos.md): which themes exist, where the
 * choice is kept and how it is resolved. Independent from the CLI version's
 * palette and font on purpose, in attribute and in storage key.
 *
 * Plain module: the server layout needs the boot script as a string, and the
 * client (src/components/site-theme.tsx) needs the rest.
 */

export const SITE_THEMES = ["dusk", "light", "dracula"] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];

export const SITE_THEME_KEY = "maarkn-site-theme";
export const SITE_THEME_ATTR = "data-site-theme";
export const PREFERS_LIGHT = "(prefers-color-scheme: light)";

export function isSiteTheme(value: unknown): value is SiteTheme {
  return (SITE_THEMES as readonly unknown[]).includes(value);
}

/**
 * The two colours a theme is shown by, in a control that offers it: its beam
 * and its page. Copies of `--beam` and `--bg` (site-theme.test.ts compares
 * them): the tokens only exist for the theme that is on.
 */
export const SITE_THEME_SWATCH: Record<SiteTheme, readonly [beam: string, page: string]> = {
  dusk: ["#8ed6f0", "#27303b"],
  light: ["#6238d6", "#dfe4ee"],
  dracula: ["#bd93f9", "#282a36"],
};

/** An unknown or missing choice follows the system; it is never an error. */
export function resolveSiteTheme(saved: unknown, prefersLight: boolean): SiteTheme {
  if (isSiteTheme(saved)) return saved;
  return prefersLight ? "light" : "dusk";
}

/**
 * `resolveSiteTheme` as it runs before the first paint. Only reads storage: a
 * visit without a choice keeps following the system, and an unknown value is
 * left alone. Storage and media are guarded apart, so blocking one does not
 * cost the other.
 */
export const siteThemeBootScript = `(function(){var t=null,l=false;
try{t=localStorage.getItem(${JSON.stringify(SITE_THEME_KEY)})}catch(e){}
try{l=matchMedia(${JSON.stringify(PREFERS_LIGHT)}).matches}catch(e){}
if(${JSON.stringify(SITE_THEMES)}.indexOf(t)<0){t=l?'light':'dusk'}
document.documentElement.setAttribute(${JSON.stringify(SITE_THEME_ATTR)},t)})();
`;
