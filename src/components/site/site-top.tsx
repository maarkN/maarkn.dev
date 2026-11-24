"use client";

import { Mail } from "lucide-react";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { HoloLink } from "@/components/holo/link";
import { useClock } from "@/components/terminal/use-clock";
import { ariaCurrent, TOP_PAGES } from "@/lib/site/pages";
import { otherLocale, shortLocale, type TerminalLocale } from "@/lib/terminal/locale";
import { Mark } from "./icons";
import { CliLink, LanguageLink, pageLink, SectionLink } from "./links";
import { SearchButton } from "./search-button";
import { ThemeControl } from "./theme-control";
import styles from "./site.module.css";
import type { SiteLabels } from "./labels";

/** Where the notch's clock is. */
const HOME_ZONE = "America/Sao_Paulo";

/**
 * Availability and the time in Goiânia, from 1280px. The lines are decoration;
 * the text is text. Not live: a clock that announces itself is noise.
 */
function Notch({ labels, available }: { labels: SiteLabels["status"]; available: boolean }) {
  const time = useClock(HOME_ZONE);
  return (
    <div className={styles.notch}>
      <svg viewBox="0 0 760 34" aria-hidden="true" focusable="false">
        <path d="M0 1H166l22 26H572l22-26H760" />
        <path d="M70 7H157l22 26H300M460 33H581l22-26H690" className={styles.notchInner} />
      </svg>
      <p>
        {available && (
          <>
            <span className={styles.dot} aria-hidden="true" />
            {labels.available}
            <span aria-hidden="true"> · </span>
          </>
        )}
        {labels.clock.replace("{time}", time)}
      </p>
    </div>
  );
}

/** The top of every page of the site. */
export function SiteTop({
  locale,
  labels,
  available,
}: {
  locale: TerminalLocale;
  labels: SiteLabels;
  available: boolean;
}) {
  const pathname = usePathname();
  const next = otherLocale(locale);

  return (
    <header className={clsx("site-root site-island", styles.top)}>
      <div className={styles.row}>
        <HoloLink
          {...pageLink(locale, "home")}
          size="sm"
          className={styles.brand}
          aria-label={labels.brand}
          aria-current={ariaCurrent(pathname, "home")}
        >
          <Mark />
          <span className={styles.wordmark}>
            maarkn<span>.dev</span>
          </span>
        </HoloLink>

        <nav className={styles.pages} aria-label={labels.pagesLabel}>
          <ul>
            {TOP_PAGES.map((page) => (
              <li key={page}>
                <HoloLink {...pageLink(locale, page)} size="sm" aria-current={ariaCurrent(pathname, page)}>
                  {labels.pages[page]}
                </HoloLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.tools}>
          <SearchButton locale={locale} labels={labels} />
          <LanguageLink
            locale={locale}
            label={labels.language.switch[next]}
            short={shortLocale(next).toUpperCase()}
            className={styles.language}
          />
          <ThemeControl labels={labels.theme} />
          <CliLink locale={locale} size="sm" icon aria-label={labels.cli} title={labels.cli}>
            <span className={styles.cliGlyph} aria-hidden="true">
              {">_"}
            </span>
          </CliLink>
          <SectionLink
            locale={locale}
            section="contact"
            size="sm"
            variant="primary"
            className={styles.contact}
            aria-label={labels.contact}
            seed={labels.contact}
          >
            <Mail aria-hidden="true" />
            <span className={styles.contactText}>{labels.contact}</span>
          </SectionLink>
        </div>
      </div>
      <Notch labels={labels.status} available={available} />
    </header>
  );
}
