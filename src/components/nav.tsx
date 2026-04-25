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
  career?: string;
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
    { href: `/${locale}#about`, label: nav.about },
    { href: `/${locale}/projects`, label: nav.projects },
    { href: `/${locale}/career`, label: nav.career ?? "Career" },
    { href: `/${locale}/blog`, label: nav.blog },
    { href: `/${locale}#contact`, label: nav.contact },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between gap-3 px-4 sm:px-6 md:px-10 transition-colors",
          // The mobile sheet sits below the header (z-40) so the logo and the
          // close button stay reachable while the menu is open. When the sheet
          // is open we drop the backdrop blur in favor of a fully opaque bar so
          // the boundary between header and sheet is visually crisp.
          open
            ? "bg-[var(--bg)] border-b border-[var(--border)]"
            : scrolled
              ? "bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] border-b border-[var(--border)] backdrop-blur-md"
              : "bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] border-b border-transparent backdrop-blur-md"
        )}
      >
        <Link
          href={`/${locale}`}
          className="dev-glitch flex items-center font-display text-base font-bold tracking-tight text-[var(--text)]"
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
            className={cn(
              "md:hidden relative inline-flex h-11 w-11 items-center justify-center overflow-hidden border transition-colors",
              open
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            )}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <AnimatePresence initial={false} mode="wait">
              {open ? (
                <motion.span
                  key="close"
                  initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <X className="h-5 w-5" strokeWidth={2.4} />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ opacity: 0, rotate: 90, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -90, scale: 0.7 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Menu className="h-5 w-5" strokeWidth={2.2} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ backgroundColor: "var(--bg)" }}
            className="md:hidden fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col"
          >
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
              }}
              className="flex flex-col"
            >
              {items.map((it, i) => (
                <motion.li
                  key={it.href}
                  variants={{
                    hidden: { opacity: 0, x: 24 },
                    show: { opacity: 1, x: 0 },
                  }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
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
            </motion.ul>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mt-auto border-t border-[var(--border)] px-6 py-6"
            >
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Theme · Language
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <ThemeSwitcher labels={themes} />
                <LangSwitcher current={locale} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
