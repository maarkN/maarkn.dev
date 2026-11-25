"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { controlClass } from "@/components/holo/button";
import { HoloDialog } from "@/components/holo/dialog";
import { HoloFrame } from "@/components/holo/frame";
import type { AdminLocale } from "@/lib/admin/locale";
import { NAV_ITEMS, SHORTCUTS, type NavItem } from "@/lib/admin/nav";
import { NAV_ICONS } from "./icons";
import type { ShellLabels } from "./labels";
import { NavGroups } from "./side-menu";
import styles from "./shell.module.css";

/** On a phone, at the foot of the screen: four screens, and "Mais" for the rest. */
export function PhoneBar({ current, labels }: { current: NavItem | null; locale: AdminLocale; labels: ShellLabels }) {
  const [open, setOpen] = useState(false);
  const shown = SHORTCUTS.flatMap((key) => NAV_ITEMS.filter((item) => item.key === key));
  const elsewhere = current !== null && !SHORTCUTS.includes(current.key);

  return (
    <>
      <nav className={styles.bar} aria-label={labels.shell.shortcuts}>
        <ul>
          {shown.map(({ key, href }) => {
            const Icon = NAV_ICONS[key];
            const name = labels.nav.items[key];
            return (
              <li key={key}>
                <Link
                  href={href ?? "/admin"}
                  aria-current={key === current?.key ? "page" : undefined}
                  data-holo=""
                  className={controlClass({ className: styles.shortcut })}
                >
                  <HoloFrame seed={name} />
                  <Icon aria-hidden="true" />
                  <span>{name}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-current={elsewhere ? "true" : undefined}
              data-holo=""
              data-more=""
              className={controlClass({ className: styles.shortcut })}
              onClick={() => setOpen(true)}
            >
              <HoloFrame seed={labels.shell.more} />
              <Menu aria-hidden="true" />
              <span>{labels.shell.more}</span>
            </button>
          </li>
        </ul>
      </nav>
      <HoloDialog
        open={open}
        onClose={() => setOpen(false)}
        title={labels.shell.everything}
        closeLabel={labels.shell.close}
        width={420}
      >
        <div
          className={styles.everything}
          // Any link, the one to the screen already open included.
          onClick={(event: MouseEvent) => {
            if ((event.target as Element).closest("a")) setOpen(false);
          }}
        >
          <NavGroups current={current} labels={labels} id="everything" />
        </div>
      </HoloDialog>
    </>
  );
}
