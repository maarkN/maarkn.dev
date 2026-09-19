"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ps1 } from "@/components/terminal/prompt";
import t from "@/components/terminal/terminal.module.css";
import { ADMIN_CWD, describeAdminRoute } from "./admin-route-chrome";
import { AdminStatusBar } from "./admin-status-bar";
import { AdminTreeNav } from "./admin-tree-nav";
import s from "./admin-chrome.module.css";

/** `id` of the page content — the skip link's target. */
const CONTENT_ID = "content";

/**
 * Frame for every authenticated `/admin/**` screen: the status bar showing
 * the location, the directory tree, a breadcrumb written as the command that
 * "opened" the screen, the content, and `cd ..`. The admin twin of
 * `@/components/terminal/page-chrome`.
 *
 * Applied in exactly one place — `AdminShell`, which every backoffice page
 * wraps its body in. `/admin/login` does not go through `AdminShell` and is
 * therefore chrome-free by construction: no bar, no tree, no `cd ..`.
 *
 * NOT a terminal: there is no prompt to type into and no command engine. The
 * chrome is the language; the screens stay forms and tables.
 */
export function AdminChrome({
  email,
  name,
  children,
}: {
  /** Signed-in address, shown as a comment at the foot of the tree. */
  email: string;
  /**
   * Natural key of the record on screen (an application's `folderName`).
   * Only the server component that loaded it knows this; without it the
   * breadcrumb falls back to the id in the URL.
   */
  name?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";
  const route = describeAdminRoute(pathname, name);

  return (
    <div className={s.shell}>
      <a href={`#${CONTENT_ID}`} className={t.skip}>
        Ir para o conteúdo
      </a>

      <div className={s.top}>
        <AdminStatusBar path={route.path} />
      </div>

      <div className={s.body}>
        <AdminTreeNav pathname={pathname} email={email} />

        <div className={s.screen}>
          <nav className={s.crumb} aria-label="Comando desta tela">
            <span aria-hidden="true">
              <Ps1 cwd={ADMIN_CWD} />
            </span>
            <span lang="en">{route.command}</span>
          </nav>

          {/* `tabIndex={-1}` is what makes the skip link actually move the
              focus: in WebKit a plain `href="#content"` only scrolls. Same
              as `@/components/terminal/page-chrome`. */}
          <main id={CONTENT_ID} tabIndex={-1} className={s.main}>
            {children}
          </main>

          <footer>
            <p className={s.back}>
              <span aria-hidden="true">
                <Ps1 cwd={ADMIN_CWD} />
              </span>
              <Link href={route.back} className={s.cd} lang="en">
                cd ..
              </Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
