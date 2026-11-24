"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Ps1 } from "./prompt";
import { StatusBar } from "./status-bar";
import { describeRoute } from "./route-chrome";
import s from "./page.module.css";
import type { TerminalLabels } from "./types";

/** `id` of the page content — the target of the site's skip link. */
const CONTENT_ID = "content";

/**
 * Frame for the inner pages (`/projects`, `/blog`, `/career`, `/links`):
 * the shell's status bar showing the page location, a breadcrumb written as
 * the command that "opened" the page, the content, and a `cd ..` link back
 * to the listing (or to the CLI version with the matching command). Everything
 * is derived from the pathname, so the `(pages)` layout applies it once. It
 * sits between the site's top and foot, so the frame itself is the `main`: its
 * bar and its foot belong to the page, not to the document. The focus after a
 * navigation is the site's (`components/site/page-passage.tsx`).
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

  return (
    <main className={s.page}>
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

          <div id={CONTENT_ID} tabIndex={-1} className={s.main}>
            {children}
          </div>

          {/* `cd ..` and the links line share the page's footer. */}
          <footer>
            <p className={s.back}>
              <span aria-hidden="true">
                <Ps1 />
              </span>
              <Link href={route.back} prefetch={false} className={s.cd} lang="en">
                {backLabel}
              </Link>
            </p>

            {footer}
          </footer>
        </div>
      </div>
    </main>
  );
}
