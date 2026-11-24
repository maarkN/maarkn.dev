"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps, type MouseEvent } from "react";
import { HoloAnchor, HoloLink } from "@/components/holo/link";
import { localizedHref, otherLocale, rememberLocale, type TerminalLocale } from "@/lib/terminal/locale";
import { pageHref, sectionHref, type PageKey, type SectionKey } from "@/lib/site/pages";
import { terminalHref } from "@/lib/terminal/address";
import { arriveAgain } from "./arrival";

/** A plain left click: the one a client navigation answers. */
export const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** A link that still answers when the visitor is already there. */
const linkTo = (href: string) => ({
  href,
  onClick: (event: MouseEvent) => {
    if (plainClick(event) && arriveAgain(href)) event.preventDefault();
  },
});

/**
 * What makes a link one to a page of the site. The home puts itself back where
 * the visitor left it (home-scroll.tsx), so the router must not take it to the
 * top first; from the home, the way to the top is this link.
 */
export const pageLink = (locale: string, page: PageKey) => ({
  ...linkTo(pageHref(locale, page)),
  scroll: page !== "home",
});

/** To a section of the home. */
export function SectionLink({
  locale,
  section,
  ...props
}: Omit<ComponentProps<typeof HoloLink>, "href"> & { locale: string; section: SectionKey }) {
  return <HoloLink {...props} {...linkTo(sectionHref(locale, section))} />;
}

/** The CLI version. Not prefetched: it is a whole other experience to download. */
export function CliLink({
  locale,
  ...props
}: Omit<ComponentProps<typeof HoloLink>, "href"> & { locale: string }) {
  return <HoloLink {...props} href={terminalHref(locale)} prefetch={false} />;
}

type LanguageProps = {
  locale: TerminalLocale;
  label: string;
  short: string;
  className?: string;
};

function LanguageAnchor({ locale, label, short, className, search }: LanguageProps & { search: string }) {
  const next = otherLocale(locale);
  return (
    <HoloAnchor
      size="sm"
      className={className}
      href={localizedHref(usePathname(), search, next)}
      hrefLang={next}
      aria-label={label}
      onClick={() => rememberLocale(next)}
    >
      {short}
    </HoloAnchor>
  );
}

function LanguageAnchorHere(props: LanguageProps) {
  const search = useSearchParams().toString();
  return <LanguageAnchor {...props} search={search ? `?${search}` : ""} />;
}

/**
 * The same page in the other language, filters included. A document load on
 * purpose: `<html lang>` and the texts of both experiences change, and a
 * client navigation between languages replaces <html>, which would put the
 * CLI version's palette and font back to their defaults.
 */
export function LanguageLink(props: LanguageProps) {
  return (
    <Suspense fallback={<LanguageAnchor {...props} search="" />}>
      <LanguageAnchorHere {...props} />
    </Suspense>
  );
}
