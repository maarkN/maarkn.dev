"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { HoloIconButton } from "@/components/holo/button";
import type { TerminalLocale } from "@/lib/terminal/locale";
import type { SiteLabels } from "./labels";
import type { SearchWindowProps } from "./search-window";
import styles from "./site.module.css";

/**
 * Opens the search, by click and by ⌘K or Ctrl+K. The window, its matching and
 * its index are only downloaded the first time it opens; if that fails, the
 * next attempt tries again.
 */
export function SearchButton({ locale, labels }: { locale: TerminalLocale; labels: SiteLabels }) {
  const [open, setOpen] = useState(false);
  const [Loaded, setLoaded] = useState<ComponentType<SearchWindowProps> | null>(null);
  const loading = useRef(false);

  const toggle = useCallback(() => {
    setOpen((before) => !before);
    if (loading.current) return;
    loading.current = true;
    import("./search-window").then(
      (module) => setLoaded(() => module.SearchWindow),
      () => {
        loading.current = false;
        setOpen(false);
      },
    );
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || event.altKey || event.shiftKey) return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      if (!event.repeat) toggle();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return (
    <>
      <HoloIconButton
        size="sm"
        className={styles.search}
        label={labels.search.open}
        aria-keyshortcuts="Meta+K Control+K"
        aria-haspopup="dialog"
        onClick={toggle}
      >
        <Search aria-hidden="true" />
      </HoloIconButton>
      {Loaded && <Loaded open={open} onClose={() => setOpen(false)} locale={locale} labels={labels.search} />}
    </>
  );
}
