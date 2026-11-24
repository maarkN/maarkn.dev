import { siteThemeBootScript } from "./site-theme";

/** Storage keys of the CLI version's palette and font. */
export const THEME_KEY = "maarkn-theme";
export const FONT_KEY = "maarkn-font";

/* The CLI version: applies palette + font before first paint and migrates
   legacy values (dark|dev → soft, light → classic). */
const cliBootScript = `
(function(){var d=document.documentElement;try{
  var t=localStorage.getItem('${THEME_KEY}');
  if(t!=='soft'&&t!=='classic'){t=(t==='light')?'classic':'soft';localStorage.setItem('${THEME_KEY}',t);}
  var f=localStorage.getItem('${FONT_KEY}');
  if(f!=='caskaydia'&&f!=='daddytime'){f='caskaydia';}
  d.setAttribute('data-theme',t);d.setAttribute('data-font',f);
}catch(e){d.setAttribute('data-theme','soft');d.setAttribute('data-font','caskaydia');}})();
`;

/**
 * The single inline script of the site: both preferences, one after the other,
 * each in its own scope. `[lang]/layout.tsx` renders it as a plain <script> at
 * the top of <body>, which the parser runs before anything is painted.
 */
export const themeBootScript = cliBootScript + siteThemeBootScript;
