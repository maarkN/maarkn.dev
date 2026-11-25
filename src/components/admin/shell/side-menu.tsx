"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useState, type ReactElement } from "react";
import { clsx } from "clsx";
import { controlClass, HoloIconButton } from "@/components/holo/button";
import { HoloFrame } from "@/components/holo/frame";
import { HoloLink } from "@/components/holo/link";
import { Mark } from "@/components/site/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV, type NavItem } from "@/lib/admin/nav";
import { AccountMenu } from "./account-menu";
import { NAV_ICONS } from "./icons";
import type { ShellLabels } from "./labels";
import { setCollapsed, useWide } from "./menu-width";
import styles from "./shell.module.css";
import type { AdminLocale } from "@/lib/admin/locale";

/** Where the tips go: in the landmark of the menu, and not at the end of the page. */
const TipHost = createContext<HTMLElement | null>(null);

/** The name of an item of the menu, where only its icon fits. */
function Tip({ text, off, children }: { text: string; off: boolean; children: ReactElement }) {
  const [open, setOpen] = useState(false);
  const host = useContext(TipHost);
  return (
    <Tooltip open={open && !off} onOpenChange={setOpen}>
      {/* The tip repeats the name the item already has: not a description too. */}
      <TooltipTrigger asChild aria-describedby={undefined}>
        {children}
      </TooltipTrigger>
      <TooltipContent container={host} side="right" sideOffset={10} className={styles.tip}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function NavEntry({
  item,
  current,
  labels,
  named = true,
}: {
  item: NavItem;
  current: boolean;
  labels: ShellLabels;
  /** The name is on screen, so it needs no tip. */
  named?: boolean;
}) {
  const Icon = NAV_ICONS[item.key];
  const name = labels.nav.items[item.key];

  if (item.href === null) {
    return (
      <Tip text={`${name} · ${labels.shell.soon}`} off={named}>
        {/* A plain <span>: no href, no tabIndex, nothing to focus. */}
        <span className={clsx(styles.entry, styles.soon)}>
          <Icon aria-hidden="true" />
          <span className={styles.entryName}>
            {name} <small>{labels.shell.soon}</small>
          </span>
        </span>
      </Tip>
    );
  }

  return (
    <Tip text={name} off={named}>
      <Link
        href={item.href}
        aria-current={current ? "page" : undefined}
        data-holo=""
        className={controlClass({ size: "sm", className: styles.entry })}
      >
        <HoloFrame seed={name} />
        <Icon aria-hidden="true" />
        <span className={styles.entryName}>{name}</span>
      </Link>
    </Tip>
  );
}

/** Every group of the menu; the side of a wide screen and the "Mais" of a phone. */
export function NavGroups({
  current,
  labels,
  named,
  id,
}: {
  current: NavItem | null;
  labels: ShellLabels;
  named?: boolean;
  /** Prefix of the ids of the headings. */
  id: string;
}) {
  return NAV.map((group) => (
    <section key={group.key} className={styles.group} aria-labelledby={`${id}-${group.key}`}>
      <h2 id={`${id}-${group.key}`} className={styles.groupName}>
        {labels.nav.groups[group.key]}
      </h2>
      <ul>
        {group.items.map((item) => (
          <li key={item.key}>
            <NavEntry item={item} current={item.key === current?.key} labels={labels} named={named} />
          </li>
        ))}
      </ul>
    </section>
  ));
}

export function SideMenu({
  current,
  collapsed,
  email,
  locale,
  labels,
}: {
  current: NavItem | null;
  collapsed: boolean;
  email: string;
  locale: AdminLocale;
  labels: ShellLabels;
}) {
  const named = useWide() && !collapsed;
  const [host, setHost] = useState<HTMLElement | null>(null);
  const toggle = collapsed ? labels.shell.expand : labels.shell.collapse;

  return (
    <aside className={styles.side}>
      <HoloLink href="/admin" size="sm" className={styles.brand} aria-label={labels.shell.brand}>
        <Mark />
        <span className={styles.wordmark}>
          maarkn<span>.dev</span>
        </span>
      </HoloLink>
      <nav id="admin-menu" className={styles.menu} aria-label={labels.shell.menu}>
        <TipHost value={host}>
          <NavGroups current={current} labels={labels} named={named} id="menu" />
        </TipHost>
      </nav>
      <div ref={setHost} className={styles.host} />
      <div className={styles.foot}>
        <HoloIconButton
          size="sm"
          className={styles.collapse}
          label={toggle}
          title={toggle}
          seed="menu"
          aria-expanded={!collapsed}
          aria-controls="admin-menu"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </HoloIconButton>
        <AccountMenu email={email} locale={locale} labels={labels} side="top" />
      </div>
    </aside>
  );
}
