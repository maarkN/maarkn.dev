"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useState } from "react";
import { FONT_KEY, THEME_KEY } from "@/lib/theme-boot";

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

const isTheme = (v: unknown): v is Theme => THEMES.includes(v as Theme);
const isFont = (v: unknown): v is Font => FONTS.includes(v as Font);

/**
 * What the visitor picked in this document. Module state on purpose: it
 * outlives the provider, which remounts on every language switch (the locale
 * is a param of the root layout, so the `<html>` comes back as `soft` +
 * `caskaydia` while the boot script does not run again). It also holds the
 * choice when storage is blocked. Only written by the setters below, which
 * run in the browser; a document load starts it empty.
 */
const chosen: { theme?: Theme; font?: Font } = {};

function readStored<T>(key: string, guard: (v: unknown) => v is T): T | null {
  try {
    const v = localStorage.getItem(key);
    return guard(v) ? v : null;
  } catch {
    return null;
  }
}

function readAttr<T>(name: string, guard: (v: unknown) => v is T): T | null {
  const v = document.documentElement.getAttribute(name);
  return guard(v) ? v : null;
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* blocked storage: `chosen` keeps the choice until the document reloads */
  }
}

/** Memory, then storage, then whatever the boot script applied, then the default. */
const resolveTheme = (): Theme =>
  chosen.theme ?? readStored(THEME_KEY, isTheme) ?? readAttr("data-theme", isTheme) ?? "soft";
const resolveFont = (): Font =>
  chosen.font ?? readStored(FONT_KEY, isFont) ?? readAttr("data-font", isFont) ?? "caskaydia";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The server (and so the first client render) knows no preference.
  const [theme, setThemeState] = useState<Theme>("soft");
  const [font, setFontState] = useState<Font>("caskaydia");

  // Before paint, on every mount: the first load agrees with the boot script,
  // and a language switch puts the choice back on the `<html>` the root
  // layout just recreated. Nothing is written here: only the visitor's own
  // switch reaches storage (the boot script still migrates legacy values).
  useLayoutEffect(() => {
    const t = resolveTheme();
    const f = resolveFont();
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.setAttribute("data-font", f);
    setThemeState(t);
    setFontState(f);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    chosen.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    store(THEME_KEY, t);
    setThemeState(t);
  }, []);

  const setFont = useCallback((f: Font) => {
    chosen.font = f;
    document.documentElement.setAttribute("data-font", f);
    store(FONT_KEY, f);
    setFontState(f);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "soft" ? "classic" : "soft";
    setTheme(next);
    return next;
  }, [theme, setTheme]);

  const toggleFont = useCallback(() => {
    const next: Font = font === "caskaydia" ? "daddytime" : "caskaydia";
    setFont(next);
    return next;
  }, [font, setFont]);

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
