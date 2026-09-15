"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/** Dracula palettes. `soft` is the default; `classic` the original colours. */
export type Theme = "soft" | "classic";
export const THEMES: Theme[] = ["soft", "classic"];

/** Monospace faces. `caskaydia` = Cascadia Code; `daddytime` = DaddyTimeMono. */
export type Font = "caskaydia" | "daddytime";
export const FONTS: Font[] = ["caskaydia", "daddytime"];

export type ThemeApi = {
  theme: Theme;
  font: Font;
  setTheme: (t: Theme) => void;
  setFont: (f: Font) => void;
  toggleTheme: () => Theme;
  toggleFont: () => Font;
};

const ThemeCtx = createContext<ThemeApi | null>(null);

const THEME_KEY = "maarkn-theme";
const FONT_KEY = "maarkn-font";

const isTheme = (v: unknown): v is Theme => THEMES.includes(v as Theme);
const isFont = (v: unknown): v is Font => FONTS.includes(v as Font);

function readAttr<T>(name: string, guard: (v: unknown) => v is T, fallback: T): T {
  const v = document.documentElement.getAttribute(name);
  return guard(v) ? v : fallback;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("soft");
  const [font, setFontState] = useState<Font>("caskaydia");

  // Adopt whatever the boot script already applied (it ran before hydration
  // and handled storage + legacy migration), so the first client render agrees
  // with the DOM instead of flashing back to the defaults.
  useEffect(() => {
    setThemeState(readAttr("data-theme", isTheme, "soft"));
    setFontState(readAttr("data-font", isFont, "caskaydia"));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font", font);
    try {
      localStorage.setItem(FONT_KEY, font);
    } catch {}
  }, [font]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const setFont = useCallback((f: Font) => setFontState(f), []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "soft" ? "classic" : "soft";
    setThemeState(next);
    return next;
  }, [theme]);

  const toggleFont = useCallback(() => {
    const next: Font = font === "caskaydia" ? "daddytime" : "caskaydia";
    setFontState(next);
    return next;
  }, [font]);

  return (
    <ThemeCtx.Provider value={{ theme, font, setTheme, setFont, toggleTheme, toggleFont }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/* Inline pre-hydration script: applies palette + font before first paint and
   migrates legacy values (dark|dev → soft, light → classic). */
export const themeBootScript = `
(function(){var d=document.documentElement;try{
  var t=localStorage.getItem('${THEME_KEY}');
  if(t!=='soft'&&t!=='classic'){t=(t==='light')?'classic':'soft';localStorage.setItem('${THEME_KEY}',t);}
  var f=localStorage.getItem('${FONT_KEY}');
  if(f!=='caskaydia'&&f!=='daddytime'){f='caskaydia';}
  d.setAttribute('data-theme',t);d.setAttribute('data-font',f);
}catch(e){d.setAttribute('data-theme','soft');d.setAttribute('data-font','caskaydia');}})();
`;
