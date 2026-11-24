"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { controlClass, type HoloSize } from "./button";
import { HoloFrame } from "./frame";
import styles from "./holo.module.css";

export type HoloTab = { id: string; label: string; content: ReactNode };

/**
 * Tabs with automatic activation: one tab stop for the list, arrows, `Home`
 * and `End` move and select, and the panel is the next stop.
 */
export function HoloTabs({
  label,
  tabs,
  defaultTab,
  size,
  onChange,
}: {
  /** Accessible name of the list. */
  label: string;
  tabs: HoloTab[];
  defaultTab?: string;
  size?: HoloSize;
  onChange?: (id: string) => void;
}) {
  const base = useId();
  const list = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(defaultTab ?? tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === selected) ?? tabs[0];
  if (!current) return null;

  const select = (id: string) => {
    setSelected(id);
    if (id !== current.id) onChange?.(id);
  };

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.indexOf(current);
    const target = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = tabs[(target + tabs.length) % tabs.length];
    select(next.id);
    list.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(next.id)}"]`)?.focus();
  };

  return (
    <div>
      <div ref={list} role="tablist" aria-label={label} className={styles.tabList} onKeyDown={move}>
        {tabs.map((tab) => {
          const active = tab === current;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              data-tab={tab.id}
              aria-selected={active}
              aria-controls={active ? `${base}-panel-${tab.id}` : undefined}
              tabIndex={active ? 0 : -1}
              data-holo=""
              className={controlClass({ size })}
              onClick={() => select(tab.id)}
            >
              <HoloFrame seed={tab.label} />
              <span className={styles.label}>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel-${current.id}`}
        aria-labelledby={`${base}-tab-${current.id}`}
        tabIndex={0}
        className={styles.tabPanel}
      >
        {current.content}
      </div>
    </div>
  );
}
