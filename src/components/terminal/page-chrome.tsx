"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Ps1 } from "./prompt";
import { StatusBar } from "./status-bar";
import { describeRoute } from "./route-chrome";
import s from "./page.module.css";
import type { TerminalLabels } from "./types";

/**
 * Frame for the inner pages (`/projects`, `/blog`, `/career`, `/links`):
 * the shell's status bar showing the page location, a breadcrumb written as
 * the command that "opened" the page, the content, and a `cd ..` link back
 * to the listing (or to the home with the matching command). Everything is
 * derived from the pathname, so the `(pages)` layout applies it once.
 */
export function PageChrome({
  labels,
  backLabel,
  footer,
  children,
}: {
  labels: TerminalLabels["bar"];
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
    <div className={s.page}>
      <div className={s.top}>
        <StatusBar labels={labels} locale={locale} path={route.path} />
      </div>

      <div className={s.body}>
        <div className={s.inner}>
          <p className={s.crumb} aria-hidden="true">
            <Ps1 />
            {route.command}
          </p>

          <main id="content">{children}</main>

          <p className={s.back}>
            <Ps1 />
            <Link href={route.back} className={s.cd}>
              {backLabel}
            </Link>
          </p>

          {footer}
        </div>
      </div>
    </div>
  );
}
