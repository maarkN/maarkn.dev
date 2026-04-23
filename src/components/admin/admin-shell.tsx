import Link from "next/link";
import { LogoutButton } from "./logout-button";

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3 md:px-10">
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="font-display text-base font-bold tracking-tight text-[var(--text)]"
          >
            maarkn<span className="text-[var(--accent)]">.dev</span>
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              admin
            </span>
          </Link>
          <nav className="hidden md:block">
            <ul className="flex items-center gap-1">
              <li>
                <Link
                  href="/admin"
                  className="px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                >
                  Projects
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                >
                  View site
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] tracking-[0.04em] text-[var(--muted)] md:inline">
            {email}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 px-6 py-10 md:px-10">{children}</main>
    </div>
  );
}
