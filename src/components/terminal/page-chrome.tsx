"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Ps1 } from "./prompt";
import { StatusBar } from "./status-bar";
import { describeRoute } from "./route-chrome";
import { arrivedByNavigation, rememberRoute } from "./route-focus";
import s from "./page.module.css";
import type { TerminalLabels } from "./types";

/** `id` of the page content — the skip link's target. */
export const CONTENT_ID = "content";

/**
 * Frame for the inner pages (`/projects`, `/blog`, `/career`, `/links`):
 * the shell's status bar showing the page location, a breadcrumb written as
 * the command that "opened" the page, the content, and a `cd ..` link back
 * to the listing (or to the home with the matching command). Everything is
 * derived from the pathname, so the `(pages)` layout applies it once.
 */
export function PageChrome({
  labels,
  a11y,
  backLabel,
  footer,
  children,
}: {
  labels: TerminalLabels["bar"];
  a11y: TerminalLabels["a11y"];
  /** `cd ..` */
  backLabel: string;
  /** Rendered below `cd ..`, inside the same column. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const route = describeRoute(pathname);
  const locale = pathname.split("/").filter(Boolean)[0] ?? "en";
  const main = useRef<HTMLElement>(null);

  // After a client-side navigation (`open 1`, a listing link) the focus goes
  // to the page title, so keyboard and screen-reader users land on the
  // content instead of at the top of the document. A fresh load is left
  // alone: its first Tab must reach the skip link.
  useEffect(() => {
    if (arrivedByNavigation(pathname)) {
      main.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    }
    rememberRoute(pathname);
  }, [pathname]);

  return (
    <div className={s.page}>
      <a href={`#${CONTENT_ID}`} className={s.skip}>
        {a11y.skipToContent}
      </a>
      <div className={s.top}>
        <StatusBar labels={labels} locale={locale} path={route.path} />
      </div>

      <div className={s.body}>
        <div className={s.inner}>
          <nav className={s.crumb} aria-label={a11y.breadcrumb}>
            <span aria-hidden="true">
              <Ps1 />
            </span>
            <span lang="en">{route.command}</span>
          </nav>

          <main id={CONTENT_ID} ref={main} tabIndex={-1} className={s.main}>
            {children}
          </main>

          {/* `cd ..` and the links line share the page's footer landmark. */}
          <footer>
            <p className={s.back}>
              <span aria-hidden="true">
                <Ps1 />
              </span>
              <Link href={route.back} className={s.cd} lang="en">
                {backLabel}
              </Link>
            </p>

            {footer}
          </footer>
        </div>
      </div>
    </div>
  );
}
