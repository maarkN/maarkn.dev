"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { controlClass } from "@/components/holo/button";
import { HoloFrame } from "@/components/holo/frame";
import type { AdminLocale } from "@/lib/admin/locale";
import type { ShellLabels } from "./labels";
import type { SearchWindowProps } from "./search-window";
import styles from "./shell.module.css";

const never = () => () => {};
const isApple = () => /mac|iphone|ipad/i.test(navigator.platform);

/** A window or a menu of the screen is open, and has the focus: not over it. */
const busy = () =>
  document.querySelector('[data-slot$="-content"][data-state="open"]:not([data-slot="tooltip-content"])') !== null;

/**
 * Opens the search, by click and by ⌘K or Ctrl+K. The window is only downloaded
 * the first time, and the candidaturas only asked for when it opens.
 */
export function SearchButton({ locale, labels }: { locale: AdminLocale; labels: ShellLabels }) {
  const [open, setOpen] = useState(false);
  const [Loaded, setLoaded] = useState<ComponentType<SearchWindowProps> | null>(null);
  const loading = useRef(false);
  const apple = useSyncExternalStore(never, isApple, () => true);

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
      if (!event.repeat && !busy()) toggle();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return (
    <>
      <button
        type="button"
        data-holo=""
        data-search=""
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        className={controlClass({ size: "sm", className: styles.search })}
        onClick={toggle}
      >
        <HoloFrame seed={labels.search.open} />
        <Search aria-hidden="true" />
        <span className={styles.searchName}>{labels.search.open}</span>
        <kbd aria-hidden="true">{apple ? "⌘K" : "Ctrl K"}</kbd>
      </button>
      {Loaded && <Loaded open={open} onClose={() => setOpen(false)} locale={locale} labels={labels} />}
    </>
  );
}
