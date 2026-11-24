"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import {
  isSiteTheme,
  PREFERS_LIGHT,
  resolveSiteTheme,
  SITE_THEME_ATTR,
  SITE_THEME_KEY,
  type SiteTheme,
} from "@/lib/site-theme";

/*
 * The attribute on <html> is the state: the boot script writes it before React
 * exists, CSS reads it, and everything below follows it. Storage only keeps the
 * choice, and may be blocked.
 */

const listeners = new Set<() => void>();

/** The choice made in this visit, for when storage is blocked. */
let chosen: SiteTheme | null = null;

function savedTheme(): SiteTheme | null {
  if (chosen) return chosen;
  try {
    const saved = localStorage.getItem(SITE_THEME_KEY);
    return isSiteTheme(saved) ? saved : null;
  } catch {
    return null;
  }
}

function prefersLight(): boolean {
  return window.matchMedia?.(PREFERS_LIGHT).matches ?? false;
}

function currentTheme(): SiteTheme {
  const attr = document.documentElement.getAttribute(SITE_THEME_ATTR);
  return isSiteTheme(attr) ? attr : resolveSiteTheme(savedTheme(), prefersLight());
}

function apply(theme: SiteTheme) {
  document.documentElement.setAttribute(SITE_THEME_ATTR, theme);
  listeners.forEach((notify) => notify());
}

/**
 * Changes the theme and keeps the choice. Uses a View Transition when there is
 * one and the visitor accepts motion; otherwise the change is immediate.
 */
export function setSiteTheme(theme: SiteTheme) {
  chosen = theme;
  try {
    localStorage.setItem(SITE_THEME_KEY, theme);
  } catch {
    /* blocked storage: the choice lasts until the page is left */
  }
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (reduced || typeof document.startViewTransition !== "function") {
    apply(theme);
    return;
  }
  // The new frame is captured when the callback returns, so React has to commit inside it.
  document.startViewTransition(() => flushSync(() => apply(theme)));
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

/** The active theme; `null` on the server, which cannot know it. */
export function useSiteTheme(): SiteTheme | null {
  return useSyncExternalStore<SiteTheme | null>(subscribe, currentTheme, () => null);
}

/**
 * Mounted once by each layout that renders `.site-root`. Puts the attribute
 * back when a client navigation replaced <html> (the boot script only runs on
 * a full load), and follows the system while there is no saved choice.
 */
export function SiteThemeSync() {
  useLayoutEffect(() => {
    if (!isSiteTheme(document.documentElement.getAttribute(SITE_THEME_ATTR))) {
      apply(currentTheme());
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.(PREFERS_LIGHT);
    if (!media) return;
    const follow = () => {
      if (!savedTheme()) apply(resolveSiteTheme(null, media.matches));
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  return null;
}
