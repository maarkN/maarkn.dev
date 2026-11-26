import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { getAdminLabels, getAdminSettings } from "@/lib/admin/request";
import { Translated, Untranslated } from "./admin-locale";
import { shellLabels } from "./shell/labels";
import { COLLAPSED, MENU_COOKIE } from "./shell/menu-cookie";
import { Shell } from "./shell/shell";

/**
 * The one place the shell is applied. Every authenticated `/admin/**` page wraps
 * its body in it; `/admin/login` does not, and has no navigation by construction.
 *
 * The screens inside are in Portuguese until the change that translates each one
 * (rebrand-09 to rebrand-11), and say so. A screen that was translated passes
 * `translated`; a part of one that was not goes in `Translated`.
 */
export async function AdminShell({
  email,
  name,
  translated = false,
  children,
}: {
  email: string;
  /**
   * Name of the record on screen. The shell is client-side and only has the URL,
   * so the detail and edit pages pass it down; without it the way back says what
   * kind of record it is.
   */
  name?: string | null;
  /** The screen speaks the language of the interface: its change translated it. */
  translated?: boolean;
  children: ReactNode;
}) {
  const [{ locale }, labels, jar] = await Promise.all([getAdminSettings(), getAdminLabels(), cookies()]);
  return (
    <Shell
      email={email}
      name={name}
      locale={locale}
      labels={shellLabels(labels)}
      collapsed={jar.get(MENU_COOKIE)?.value === COLLAPSED}
    >
      {translated ? <Translated>{children}</Translated> : <Untranslated>{children}</Untranslated>}
    </Shell>
  );
}
