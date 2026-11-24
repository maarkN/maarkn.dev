"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { arrivedByNavigation, rememberRoute } from "@/components/terminal/route-focus";
import { rememberPlace } from "@/lib/site/place";

/** The element the address points at; an anchor nobody can read points at nothing. */
function anchored(): HTMLElement | null {
  try {
    return document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  } catch {
    return null;
  }
}

/**
 * After a client navigation the focus goes to the new page's title, or to the
 * section the link asked for. A fresh load is left alone: its first Tab has to
 * reach the skip link. The scroll is the router's (and home-scroll.tsx's) job.
 */
function PageFocus() {
  const pathname = usePathname();
  useEffect(() => {
    if (arrivedByNavigation(pathname)) {
      const target = anchored() ?? document.querySelector<HTMLElement>("#content h1");
      target?.focus({ preventScroll: true });
    }
    rememberRoute(pathname);
  }, [pathname]);
  return null;
}

/** Where the CLI version takes the visitor back to. */
function PlaceKeeper() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => rememberPlace(search ? `${pathname}?${search}` : pathname), [pathname, search]);
  return null;
}

/** What happens between one page of the site and the next. Rendered once, after the pages. */
export function PagePassage() {
  return (
    <>
      <PageFocus />
      <Suspense fallback={null}>
        <PlaceKeeper />
      </Suspense>
    </>
  );
}
