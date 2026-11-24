"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect } from "react";
import { arrivedByNavigation, arrivedThroughHistory, rememberRoute } from "@/components/terminal/route-focus";
import { currentPage } from "@/lib/site/pages";
import { rememberPlace } from "@/lib/site/place";
import { anchored, focusArrival } from "./arrival";

/**
 * A page opened by a link opens at its top. Not left to the router: it stays
 * where it is while the start of the new page is on the screen, and behind the
 * site's top counts as on the screen. In a layout effect, after the router's own
 * and inside the transition. A section is the router's, the browser's back and
 * forward restore what they remember, and the home puts itself back
 * (home-scroll.tsx).
 */
function PageScroll() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (!arrivedByNavigation(pathname) || arrivedThroughHistory(pathname) || anchored()) return;
    if (currentPage(pathname)?.page !== "home") window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

/**
 * After a client navigation the focus goes to the new page's title, or to the
 * section the link asked for. A fresh load is left alone: its first Tab has to
 * reach the skip link.
 */
function PageFocus() {
  const pathname = usePathname();
  useEffect(() => {
    if (arrivedByNavigation(pathname)) focusArrival();
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
      <PageScroll />
      <PageFocus />
      <Suspense fallback={null}>
        <PlaceKeeper />
      </Suspense>
    </>
  );
}
