"use client";

/**
 * Backoffice menu, rendered as `tree` output.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A MENU ENTRY
 * The menu already lists every screen the roadmap will build. Entries whose
 * route does not exist yet carry `ready: false` and render as a COMMENT
 * (`replies/  # em breve`) — never as a 404 link, and never focusable.
 *
 * When you land the route, flip that one `ready` flag to `true` and move the
 * entry out of the trailing "em breve" block. That is the only change needed;
 * nothing else in this file is per-screen.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * THE GRID IS THE WHOLE IDEA. Every row is three columns — connector, icon,
 * label — so the icon lives in a fixed-width box and can never push a label
 * out of the monospaced column the row above set. Adding an entry with a
 * different icon size, or dropping the icon box, breaks the tree visually for
 * all fourteen rows at once.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Briefcase,
  FolderKanban,
  GraduationCap,
  Kanban,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Newspaper,
  Radar,
  ScrollText,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import s from "./admin-chrome.module.css";

interface NavItem {
  href: string;
  /** The entry as it reads in the tree — a directory name, in English. */
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  /** `true` → indented one level, under the entry above it. */
  child?: boolean;
  /** `false` → the route does not exist yet: a `# em breve` comment line. */
  ready: boolean;
}

/**
 * Tree entries, in reading order. The three unbuilt ones sit at the end so the
 * working part of the menu stays above the fold on short screens.
 */
export const NAV: NavItem[] = [
  { href: "/admin", name: "dashboard", icon: LayoutDashboard, ready: true },
  { href: "/admin/projects", name: "projects/", icon: FolderKanban, ready: true },
  { href: "/admin/applications", name: "applications/", icon: Briefcase, ready: true },
  { href: "/admin/applications/board", name: "board", icon: Kanban, child: true, ready: true },
  { href: "/admin/jobs", name: "jobs/", icon: Radar, ready: true },
  { href: "/admin/contacts", name: "contacts/", icon: Users, ready: true },
  { href: "/admin/generator", name: "generator/", icon: Sparkles, ready: true },
  { href: "/admin/api-keys", name: "api-keys/", icon: KeyRound, ready: true },
  { href: "/admin/audit", name: "audit/", icon: ScrollText, ready: true },
  { href: "/admin/chat", name: "chat/", icon: MessageSquare, ready: true },
  // Account settings: the only place the admin password can be rotated.
  { href: "/admin/settings", name: "settings/", icon: Settings, ready: true },
  { href: "/admin/replies", name: "replies/", icon: MessagesSquare, ready: false },
  { href: "/admin/posts", name: "posts/", icon: Newspaper, ready: false },
  { href: "/admin/experiences", name: "experiences/", icon: GraduationCap, ready: false },
];

/** `/admin` matches exactly; every other entry also matches its subtree. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Href do ÚNICO item que deve ficar ativo — o mais específico que casa.
 *
 * `isNavItemActive` sozinho casa a subárvore, então em `/admin/applications/board`
 * tanto `/admin/applications` quanto `/admin/applications/board` davam
 * verdadeiro: dois itens acesos e dois `aria-current="page"` na mesma `<nav>`,
 * o que quebra a navegação por leitor de tela (só uma página é "a atual").
 * Vence o href mais longo — o item pai continua ativo em `/admin/applications/123`,
 * onde nenhuma entrada mais específica existe.
 */
export function activeNavHref(pathname: string): string | null {
  let best: string | null = null;
  for (const item of NAV) {
    if (!isNavItemActive(pathname, item.href)) continue;
    if (best === null || item.href.length > best.length) best = item.href;
  }
  return best;
}

/**
 * `├── ` for every entry but the last of its block, `└── ` for the last one;
 * a child is prefixed with the `│   ` (or blank) gutter of its parent level.
 * Pure string work, so the connectors stay in the same monospaced columns the
 * CSS grid reserves for them.
 */
function connector(index: number): string {
  const item = NAV[index];
  const next = NAV[index + 1];
  if (item.child) {
    // Only child of the entry above: always the last of its own block. The
    // gutter shows whether the PARENT still has siblings below.
    const parentHasSiblings = NAV.slice(index + 1).some((n) => !n.child);
    return `${parentHasSiblings ? "│" : " "}   └── `;
  }
  const lastTop = !NAV.slice(index + 1).some((n) => !n.child);
  return lastTop && !next ? "└── " : "├── ";
}

export function AdminTreeNav({ pathname, email }: { pathname: string; email: string }) {
  const activeHref = activeNavHref(pathname);
  const [open, setOpen] = useState(false);
  const active = useRef<HTMLAnchorElement>(null);

  // The tree collapses on phones; when it opens, the current screen's entry
  // has to be on screen — the list is fourteen rows inside a 60dvh panel.
  useEffect(() => {
    if (open) active.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  return (
    <nav className={s.nav} aria-label="Navegação do backoffice">
      <button
        type="button"
        className={s.toggle}
        aria-expanded={open}
        aria-controls="admin-tree"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{open ? "▾ " : "▸ "}</span>
        tree ~/admin
      </button>

      <div id="admin-tree" className={clsx(s.navPanel, !open && s.navPanelClosed)}>
        <p className={s.navRoot} lang="en">
          ~/admin
        </p>
        <ul className={s.navList}>
          {NAV.map((item, i) => {
            const isActive = item.href === activeHref;
            const row = clsx(s.row, item.child && s.child, !item.ready && s.soon);
            const inside = (
              <>
                <span className={s.tick} aria-hidden="true">
                  {connector(i)}
                </span>
                <span className={s.icon} aria-hidden="true">
                  <item.icon className="size-4" />
                </span>
                <span className={s.label} lang="en">
                  {item.name}
                  {!item.ready && <span className={s.soonTag}>{"  # em breve"}</span>}
                </span>
              </>
            );

            return (
              <li key={item.href}>
                {item.ready ? (
                  <Link
                    href={item.href}
                    ref={isActive ? active : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={row}
                  >
                    {inside}
                  </Link>
                ) : (
                  // A plain <span>: no href, no tabIndex, nothing to focus.
                  <span className={row}>{inside}</span>
                )}
              </li>
            );
          })}
        </ul>

        <p className={s.navMail} title={email}>
          {`# ${email}`}
        </p>
      </div>
    </nav>
  );
}
