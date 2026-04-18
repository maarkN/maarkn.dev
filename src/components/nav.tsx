"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "./theme-switcher";
import { LangSwitcher } from "./lang-switcher";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

type NavLabels = {
  home: string;
  about: string;
  projects: string;
  skills: string;
  blog: string;
  contact: string;
};

type ThemeLabels = { light: string; dark: string; dev: string };

export function Nav({
  locale,
  nav,
  themes,
}: {
  locale: Locale;
  nav: NavLabels;
  themes: ThemeLabels;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items: { href: string; label: string }[] = [
    { href: `/${locale}`, label: nav.home },
    { href: `/${locale}#about`, label: nav.about },
    { href: `/${locale}#work`, label: nav.projects },
    { href: `/${locale}#toolkit`, label: nav.skills },
    { href: `/${locale}#contact`, label: nav.contact },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-6 md:px-10 backdrop-blur-md transition-colors",
        scrolled
          ? "bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] border-b border-[var(--border)]"
          : "bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] border-b border-transparent"
      )}
    >
      <Link
        href={`/${locale}`}
        className="font-display text-base font-bold tracking-tight text-[var(--text)]"
        aria-label="maarkn home"
      >
        maarkn<span className="text-[var(--accent)]">.dev</span>
      </Link>

      <nav className="hidden md:flex items-center gap-0">
        {items.slice(1).map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="relative px-4 py-2 font-display text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            {it.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <ThemeSwitcher labels={themes} />
        <LangSwitcher current={locale} />
      </div>
    </header>
  );
}
