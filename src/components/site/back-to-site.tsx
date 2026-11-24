"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { placeToReturn } from "@/lib/site/place";
import { isTerminalLocale } from "@/lib/terminal/locale";

const never = () => () => {};

/**
 * From the CLI version to the page of the site the visitor was on, in the
 * language they are reading now. Without JavaScript, or without a page to go
 * back to, the home. Not prefetched: it would download the site's fonts.
 */
export function BackToSite({
  locale,
  className,
  children,
}: {
  locale: string;
  className?: string;
  children: ReactNode;
}) {
  const home = `/${locale}`;
  const href = useSyncExternalStore(
    never,
    () => (isTerminalLocale(locale) ? placeToReturn(locale) : home),
    () => home,
  );
  return (
    <Link href={href} scroll={href !== home} prefetch={false} className={className}>
      {children}
    </Link>
  );
}
