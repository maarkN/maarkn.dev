"use client";

import { THEMES, useTheme, type Theme } from "./theme-provider";
import { cn } from "@/lib/utils";

type Labels = Record<Theme, string>;

export function ThemeSwitcher({ labels }: { labels: Labels }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex border border-[var(--border)] bg-[var(--surface)]"
    >
      {THEMES.map((t) => {
        const active = theme === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(t)}
            className={cn(
              "px-2.5 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
              active
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            )}
            data-theme-key={t}
          >
            {labels[t]}
          </button>
        );
      })}
    </div>
  );
}
