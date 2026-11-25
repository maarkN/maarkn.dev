"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
import { clsx } from "clsx";
import { controlClass } from "@/components/holo/button";
import { HoloFrame } from "@/components/holo/frame";
import { HoloLink } from "@/components/holo/link";
import { ariaCurrent, currentPage, PAGES, SECTIONS } from "@/lib/site/pages";
import { pageLink, SectionLink } from "./links";
import type { SiteLabels } from "./labels";
import styles from "./site.module.css";

/**
 * Pages and sections, at the base of the screen, where the top has no room for
 * them. A <details>, so it opens and its links work without JavaScript; with
 * it, choosing, `Esc`, the focus leaving and a tap outside close it.
 */
export function BaseMenu({ locale, labels }: { locale: string; labels: SiteLabels }) {
  const pathname = usePathname();
  const details = useRef<HTMLDetailsElement>(null);
  const here = currentPage(pathname)?.page ?? "home";

  const close = () => {
    if (details.current) details.current.open = false;
  };

  useEffect(close, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!details.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !details.current?.open) return;
    event.preventDefault();
    close();
    details.current.querySelector("summary")?.focus();
  };

  /** Any link, the one to the page the visitor is already on included. */
  const onChoose = (event: MouseEvent) => {
    if ((event.target as Element).closest("a")) close();
  };

  const onBlur = (event: FocusEvent) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
  };

  return (
    <nav className={clsx("site-root site-island", styles.base)} aria-label={labels.menu}>
      <details ref={details} onKeyDown={onKeyDown} onBlur={onBlur}>
        <summary data-holo="" className={controlClass({ size: "lg", className: styles.baseButton })}>
          <HoloFrame seed={labels.menu} />
          <span className={styles.baseLabel}>
            <Menu className={styles.whenClosed} aria-hidden="true" />
            <X className={styles.whenOpen} aria-hidden="true" />
            <span>{labels.menu}</span>
            <span className={styles.baseHere}>{labels.pages[here]}</span>
          </span>
        </summary>
        <div className={styles.basePanel} onClick={onChoose}>
          <ul>
            {PAGES.map((page) => (
              <li key={page}>
                <HoloLink {...pageLink(locale, page)} aria-current={ariaCurrent(pathname, page)}>
                  {labels.pages[page]}
                </HoloLink>
              </li>
            ))}
          </ul>
          <ul>
            {SECTIONS.map((section) => (
              <li key={section}>
                <SectionLink locale={locale} section={section}>
                  {labels.sections[section]}
                </SectionLink>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </nav>
  );
}
