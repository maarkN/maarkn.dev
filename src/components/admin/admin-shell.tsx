"use client";

/**
 * Backoffice shell — the reference admin `app-shell.tsx` ported to the App Router:
 * fixed 240px sidebar, items from a single `NAV` array, active item from
 * `usePathname()`, `<Outlet/>` replaced by `{children}`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A MENU ENTRY
 * The menu already lists every screen the roadmap will build. Entries whose
 * route does not exist yet carry `ready: false` and render as a DISABLED item
 * with an "em breve" tooltip — never as a 404 link.
 *
 * When you land the route, flip that one `ready` flag to `true`. That is the
 * only change needed; nothing else in this file is per-screen.
 * ─────────────────────────────────────────────────────────────────────────
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  ExternalLink,
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
  Terminal,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./logout-button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** `false` → the route does not exist yet: disabled + "em breve" tooltip. */
  ready: boolean;
}

/** Sidebar items. Order is the reading order of the backoffice. */
export const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/admin/projects", label: "Projetos", icon: FolderKanban, ready: true },
  {
    href: "/admin/applications",
    label: "Candidaturas",
    icon: Briefcase,
    ready: true,
  },
  {
    href: "/admin/applications/board",
    label: "Funil (Kanban)",
    icon: Kanban,
    ready: true,
  },
  { href: "/admin/jobs", label: "Vagas", icon: Radar, ready: true },
  { href: "/admin/contacts", label: "Contatos", icon: Users, ready: true },
  { href: "/admin/generator", label: "Gerador", icon: Sparkles, ready: true },
  {
    href: "/admin/replies",
    label: "Respostas",
    icon: MessagesSquare,
    ready: false,
  },
  { href: "/admin/posts", label: "Posts", icon: Newspaper, ready: false },
  {
    href: "/admin/experiences",
    label: "Experiências",
    icon: GraduationCap,
    ready: false,
  },
  {
    href: "/admin/api-keys",
    label: "Chaves de API",
    icon: KeyRound,
    ready: true,
  },
  { href: "/admin/audit", label: "Auditoria", icon: ScrollText, ready: true },
  { href: "/admin/chat", label: "Chat", icon: MessageSquare, ready: true },
  // Account settings: the only place the admin password can be rotated.
  { href: "/admin/settings", label: "Configurações", icon: Settings, ready: true },
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

const ITEM_BASE =
  "flex items-center gap-2 px-3 py-2 text-sm transition-colors";

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const activeHref = activeNavHref(pathname);

  const initials =
    email
      .split(/[@._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh bg-background">
        <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-4 transition-opacity hover:opacity-80"
          >
            <Terminal className="size-6 text-primary" />
            <div className="leading-tight">
              <div className="font-display font-semibold tracking-tight">
                maarkn<span className="text-brand">.dev</span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                backoffice
              </div>
            </div>
          </Link>
          <Separator />

          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {NAV.map((item) =>
              item.ready ? (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.href === activeHref ? "page" : undefined}
                  className={cn(
                    ITEM_BASE,
                    item.href === activeHref
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ) : (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {/* A <span>, not a disabled <button>: Radix tooltips never
                        fire on a disabled element (pointer-events: none). */}
                    <span
                      aria-disabled="true"
                      tabIndex={0}
                      className={cn(
                        ITEM_BASE,
                        "cursor-not-allowed text-muted-foreground/50 select-none",
                      )}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right">em breve</TooltipContent>
                </Tooltip>
              ),
            )}
          </nav>

          <Separator />
          <div className="space-y-2 p-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              Ver o site
            </Link>
            <div className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-tight">
                <div
                  className="truncate font-mono text-[11px] text-muted-foreground"
                  title={email}
                >
                  {email}
                </div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-hidden p-6">{children}</main>
      </div>
    </TooltipProvider>
  );
}
