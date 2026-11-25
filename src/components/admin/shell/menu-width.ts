"use client";

import { useSyncExternalStore } from "react";
import { COLLAPSED, MENU_COOKIE } from "./menu-cookie";

/*
 * Whether the menu shows names or only icons. Wide screens choose, and the choice
 * is a cookie so that the server already draws the menu as it will be; narrower
 * ones only have room for icons (shell.module.css has the same width).
 */

const WIDE = "(min-width: 1360px)";
const YEAR = 60 * 60 * 24 * 365;

const listeners = new Set<() => void>();
/** The choice made in this visit, for when cookies are blocked. */
let chosen: boolean | null = null;

function saved(): boolean {
  return chosen ?? document.cookie.split("; ").includes(`${MENU_COOKIE}=${COLLAPSED}`);
}

export function setCollapsed(collapsed: boolean) {
  chosen = collapsed;
  document.cookie = `${MENU_COOKIE}=${collapsed ? COLLAPSED : "open"}; path=/admin; max-age=${YEAR}; samesite=lax`;
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

export function useCollapsed(fromServer: boolean): boolean {
  return useSyncExternalStore(subscribe, saved, () => fromServer);
}

function subscribeToWidth(notify: () => void) {
  const media = window.matchMedia(WIDE);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

/** Only for what has no CSS (the tips): the server answers as a narrow screen. */
export function useWide(): boolean {
  return useSyncExternalStore(subscribeToWidth, () => window.matchMedia(WIDE).matches, () => false);
}
