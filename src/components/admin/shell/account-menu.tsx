"use client";

import { ExternalLink, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { logoutAction } from "@/app/_actions/auth";
import { setAdminLocale } from "@/app/_actions/preferences";
import { HoloIconButton } from "@/components/holo/button";
import { setSiteTheme, useSiteTheme } from "@/components/site-theme";
import { Swatch } from "@/components/site/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADMIN_LOCALES, isAdminLocale, type AdminLocale } from "@/lib/admin/locale";
import { isSiteTheme, SITE_THEMES } from "@/lib/site-theme";
import type { ShellLabels } from "./labels";
import styles from "./shell.module.css";

/** `marco.filho@…` → `MF`; one word gives its first two letters. */
export function initials(email: string): string {
  const [first = "", second] = email.split("@")[0].split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return (second ? first[0] + second[0] : first.slice(0, 2)).toUpperCase();
}

/** Changes the language of the backoffice; the action brings the screen back in the other one. */
export async function changeLanguage(next: AdminLocale, failed: string) {
  const result = await setAdminLocale(next).catch(() => null);
  // The notices are marked as the language of the screens (layout.tsx).
  if (!result?.ok) toast.error(<span lang={document.documentElement.lang}>{result?.message ?? failed}</span>);
}

/** Theme, language, settings, the site, and the way out. */
export function AccountMenu({
  email,
  locale,
  labels,
  side,
}: {
  email: string;
  locale: AdminLocale;
  labels: ShellLabels["account"];
  side: "top" | "bottom";
}) {
  const theme = useSiteTheme();
  const [, startTransition] = useTransition();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const mark = initials(email);

  return (
    // Not modal: a modal one hides the rest of the page from screen readers with
    // the skip link and the menu still focusable in it.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <HoloIconButton
          size="md"
          variant="primary"
          className={styles.account}
          label={labels.label.replace("{initials}", mark)}
          seed={mark}
          data-account=""
        >
          {mark}
        </HoloIconButton>
      </DropdownMenuTrigger>
      {/* In the landmark of its button, and not at the end of the page. */}
      <div ref={setHost} className={styles.host} />
      <DropdownMenuContent container={host} side={side} align="end" sideOffset={10} collisionPadding={16} className={styles.menuPanel}>
        <DropdownMenuLabel className={styles.menuEmail}>{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuLabel id={`theme-${side}`}>{labels.theme}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-labelledby={`theme-${side}`}
          value={theme ?? ""}
          onValueChange={(next) => isSiteTheme(next) && setSiteTheme(next)}
        >
          {SITE_THEMES.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              data-theme-option={option}
              className={styles.menuItem}
              // Open, so that the three can be tried.
              onSelect={(event) => event.preventDefault()}
            >
              <Swatch theme={option} />
              {labels.themes[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />

        <DropdownMenuLabel id={`language-${side}`}>{labels.language}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-labelledby={`language-${side}`}
          value={locale}
          onValueChange={(next) => {
            if (isAdminLocale(next)) startTransition(() => changeLanguage(next, labels.languageFailed));
          }}
        >
          {ADMIN_LOCALES.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              lang={option}
              data-language-option={option}
              className={styles.menuItem}
            >
              {labels.languages[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className={styles.menuItem}>
          <Link href="/admin/settings">
            <Settings aria-hidden="true" />
            {labels.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={styles.menuItem}>
          <Link href="/" prefetch={false}>
            <ExternalLink aria-hidden="true" />
            {labels.site}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={styles.menuItem}
          data-sign-out=""
          onSelect={() => startTransition(() => logoutAction())}
        >
          <LogOut aria-hidden="true" />
          {labels.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
