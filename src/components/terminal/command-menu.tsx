"use client";

import type { Ref } from "react";
import { clsx } from "clsx";
import s from "./terminal.module.css";
import type { MenuItemName, TerminalLabels } from "./types";

/** Command names stay in English in every locale — it is a terminal. */
export const MENU_ITEMS: ReadonlyArray<{ name: MenuItemName; key: string }> = [
  { name: "whoami", key: "1" },
  { name: "experience", key: "2" },
  { name: "skills", key: "3" },
  { name: "projects", key: "4" },
  { name: "writing", key: "5" },
  { name: "contact", key: "6" },
  { name: "help", key: "?" },
  { name: "clear", key: "⌫" },
];

/**
 * Sidebar (desktop) / bottom strip (mobile) listing the commands. Knows
 * nothing about the registry: it only asks for a command by name and shows
 * which ones the shell reports as done and which one printed last.
 */
export function CommandMenu({
  labels,
  done,
  active = null,
  onCommand,
  ref,
}: {
  labels: TerminalLabels["menu"];
  done: ReadonlySet<string>;
  /** The content command whose output is the latest on screen, if any. */
  active?: MenuItemName | null;
  onCommand: (name: MenuItemName) => void;
  /** The `<nav>`; `Esc` in the prompt focuses its first item. */
  ref?: Ref<HTMLElement>;
}) {
  return (
    <nav ref={ref} className={s.menu} aria-label={labels.label}>
      <div className={s.menuTitle}>{labels.title}</div>
      {MENU_ITEMS.map((item) => (
        <button
          key={item.name}
          type="button"
          className={clsx(s.menuItem, done.has(item.name) && s.done)}
          data-cmd={item.name}
          aria-current={item.name === active ? "true" : undefined}
          onClick={() => onCommand(item.name)}
        >
          <kbd>{item.key}</kbd>
          {item.name}
          <span aria-hidden="true">›</span>
        </button>
      ))}
    </nav>
  );
}
