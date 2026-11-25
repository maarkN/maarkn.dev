"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { HoloLink } from "@/components/holo/link";
import { Mark } from "@/components/site/icons";
import type { AdminLocale } from "@/lib/admin/locale";
import { currentItem } from "@/lib/admin/nav";
import { AccountMenu } from "./account-menu";
import { CreateMenu } from "./create-menu";
import type { ShellLabels } from "./labels";
import { COLLAPSED } from "./menu-cookie";
import { useCollapsed } from "./menu-width";
import { PhoneBar } from "./phone-bar";
import { SearchButton } from "./search-button";
import { SideMenu } from "./side-menu";
import { Trail } from "./trail";
import styles from "./shell.module.css";

/** `id` of the screen — the skip link's target. */
const CONTENT_ID = "content";

/**
 * What is around every screen of the backoffice: the menu, the search, "Criar",
 * the account and the way back. Applied in one place, `AdminShell`.
 *
 * The menu and the account are in the document twice, at the side and at the foot
 * of a phone; the stylesheet shows one, and `display: none` keeps the other away
 * from the keyboard and from screen readers.
 */
export function Shell({
  email,
  name,
  locale,
  labels,
  collapsed: fromServer,
  children,
}: {
  email: string;
  /** The name of the record on screen: the last part of the way back. */
  name?: string | null;
  locale: AdminLocale;
  labels: ShellLabels;
  /** The menu as the server drew it. */
  collapsed: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";
  const current = currentItem(pathname);
  const collapsed = useCollapsed(fromServer);

  return (
    <div className={styles.shell} data-menu={collapsed ? COLLAPSED : undefined}>
      <a href={`#${CONTENT_ID}`} className={styles.skip}>
        {labels.shell.skip}
      </a>
      <SideMenu current={current} collapsed={collapsed} email={email} locale={locale} labels={labels} />
      <div className={styles.page}>
        <header className={styles.top}>
          <HoloLink href="/admin" size="sm" icon className={styles.topBrand} aria-label={labels.shell.brand}>
            <Mark />
          </HoloLink>
          <SearchButton locale={locale} labels={labels} />
          <CreateMenu labels={labels.create} soon={labels.shell.soon} />
          <div className={styles.topAccount}>
            <AccountMenu email={email} locale={locale} labels={labels.account} side="bottom" />
          </div>
        </header>
        <Trail pathname={pathname} name={name} labels={labels} />
        {/* `tabIndex={-1}` is what makes the skip link actually move the focus:
            in WebKit a plain `href="#content"` only scrolls. */}
        <main id={CONTENT_ID} tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>
      <PhoneBar current={current} labels={labels} />
    </div>
  );
}
