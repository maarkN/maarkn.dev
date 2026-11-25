"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { HoloButton } from "@/components/holo/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CREATE } from "@/lib/admin/nav";
import { CREATE_ICONS } from "./icons";
import type { ShellLabels } from "./labels";
import styles from "./shell.module.css";

/** What can be created, from any screen. What cannot yet says so, and takes no focus. */
export function CreateMenu({ labels, soon }: { labels: ShellLabels["create"]; soon: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <HoloButton size="sm" variant="primary" className={styles.create} data-create="">
          <Plus aria-hidden="true" />
          <span className={styles.createName}>{labels.label}</span>
        </HoloButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className={styles.menuPanel}>
        {CREATE.map(({ key, href }) => {
          const Icon = CREATE_ICONS[key];
          return href ? (
            <DropdownMenuItem key={key} asChild className={styles.menuItem}>
              <Link href={href}>
                <Icon aria-hidden="true" />
                {labels.items[key]}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={key} disabled className={styles.menuItem}>
              <Icon aria-hidden="true" />
              {labels.items[key]} <small className={styles.menuSoon}>{soon}</small>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
