"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { arrivedByNavigation } from "@/components/terminal/route-focus";

const KEY = "maarkn-home-scroll";

/** By home (one per language); the tab's storage keeps it across documents. */
const positions = new Map<string, number>();

function saved(home: string): number {
  const known = positions.get(home);
  if (known !== undefined) return known;
  try {
    const value = Number(sessionStorage.getItem(`${KEY}:${home}`));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function keep(home: string) {
  const y = positions.get(home);
  if (y === undefined) return;
  try {
    sessionStorage.setItem(`${KEY}:${home}`, String(y));
  } catch {
    /* blocked storage: lasts until the document is left */
  }
}

/**
 * The home goes back to where the visitor left it, however they come back: the
 * browser's button, the brand, the CLI version. An anchor wins, and a fresh
 * load is the browser's business. Links to the home pass `scroll={false}`, or
 * the router would take it to the top after this.
 */
export function HomeScroll() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (arrivedByNavigation(pathname) && !window.location.hash) {
      window.scrollTo({ top: saved(pathname), behavior: "instant" });
    }
    // On the way out the address changes first, and the browser may scroll for
    // the next page while this one is still here.
    const onScroll = () => {
      if (window.location.pathname === pathname) positions.set(pathname, window.scrollY);
    };
    const onHide = () => keep(pathname);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
      keep(pathname);
    };
  }, [pathname]);

  return null;
}
