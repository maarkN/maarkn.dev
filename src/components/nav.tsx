"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
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
  chat?: string;
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open and close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: { href: string; label: string }[] = [
    { href: `/${locale}/projects`, label: nav.projects },
    { href: `/${locale}/blog`, label: nav.blog },
    { href: `/${locale}#about`, label: nav.about },
    { href: `/${locale}#contact`, label: nav.contact },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between gap-3 px-4 sm:px-6 md:px-10 backdrop-blur-md transition-colors",
        scrolled
          ? "bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] border-b border-[var(--border)]"
          : "bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] border-b border-transparent"
      )}
    >
      <Link
        href={`/${locale}`}
        className="flex items-center font-display text-base font-bold tracking-tight text-[var(--text)]"
        aria-label="maarkn home"
        onClick={() => setOpen(false)}
      >
        maarkn<span className="text-[var(--accent)]">.dev</span>
      </Link>

      <nav className="hidden md:flex items-center gap-0">
        {items.map((it) => (
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
        <div className="hidden sm:flex items-center gap-2">
          <ThemeSwitcher labels={themes} />
          <LangSwitcher current={locale} />
        </div>
        <button
          type="button"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center border border-[var(--border)] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X className="h-5 w-5" strokeWidth={2.2} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={2.2} />
          )}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden fixed inset-0 top-16 z-40 flex flex-col bg-[var(--bg)]"
          >
            <ul className="flex flex-col">
              {items.map((it, i) => (
                <motion.li
                  key={it.href}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.04 * i, ease: "easeOut" }}
                >
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-[var(--text)] transition-colors hover:bg-[var(--surface)] active:bg-[var(--surface-2)]"
                  >
                    {it.label}
                    <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--muted)]">
                      0{i + 1}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>

            <div className="mt-auto border-t border-[var(--border)] px-6 py-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Theme · Language
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <ThemeSwitcher labels={themes} />
                <LangSwitcher current={locale} />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
