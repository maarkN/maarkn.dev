"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "dev";
export const THEMES: Theme[] = ["light", "dark", "dev"];

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "maarkn-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (typeof window !== "undefined" &&
      (localStorage.getItem(STORAGE_KEY) as Theme | null)) ||
      (document.documentElement.getAttribute("data-theme") as Theme | null) ||
      "dark";
    if (saved && THEMES.includes(saved)) setThemeState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/* Inline pre-hydration script: avoids dark→light flash */
export const themeBootScript = `
(function(){try{
  var t=localStorage.getItem('${STORAGE_KEY}');
  if(t!=='light'&&t!=='dark'&&t!=='dev'){t='dark';}
  document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();
`;
