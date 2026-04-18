"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

const ALL_LOCALES: Locale[] = ["en", "pt-BR"];
const LABELS: Record<Locale, string> = { en: "EN", "pt-BR": "PT" };

export function LangSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (next: Locale) => {
    if (next === current) return;
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    const segments = pathname.split("/").filter(Boolean);
    if (ALL_LOCALES.includes(segments[0] as Locale)) {
      segments[0] = next;
    } else {
      segments.unshift(next);
    }
    router.push("/" + segments.join("/"));
  };

  return (
    <div className="flex border border-[var(--border)] bg-[var(--surface)]">
      {ALL_LOCALES.map((l) => {
        const active = l === current;
        return (
          <button
            key={l}
            type="button"
            onClick={() => switchTo(l)}
            aria-pressed={active}
            className={cn(
              "px-2.5 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
              active
                ? "text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            {LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
