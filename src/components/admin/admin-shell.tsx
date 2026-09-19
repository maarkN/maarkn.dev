/**
 * Backoffice shell — the one place the terminal chrome is applied.
 *
 * Every authenticated `/admin/**` page wraps its body in `<AdminShell>`, which
 * is what gives it the status bar, the directory tree, the breadcrumb and
 * `cd ..`. `/admin/login` does not use it, and is chrome-free by construction.
 *
 * The parts live in `./terminal/`: `admin-chrome` (frame), `admin-status-bar`
 * (bar), `admin-tree-nav` (menu + the `NAV` table), `admin-route-chrome`
 * (pathname → path/command/back).
 */

import { AdminChrome } from "./terminal/admin-chrome";

export { NAV, isNavItemActive, activeNavHref } from "./terminal/admin-tree-nav";

export function AdminShell({
  email,
  name,
  children,
}: {
  email: string;
  /**
   * Natural key of the record on screen — an application's `folderName`.
   * The chrome is client-side and only has the URL, so the detail and edit
   * pages pass it down; without it the breadcrumb shows the id instead.
   */
  name?: string | null;
  children: React.ReactNode;
}) {
  return (
    <AdminChrome email={email} name={name}>
      {children}
    </AdminChrome>
  );
}
