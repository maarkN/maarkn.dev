"use client";

import { HoloIconButton } from "@/components/holo/button";
import { setSiteTheme, useSiteTheme } from "@/components/site-theme";
import { SITE_THEMES } from "@/lib/site-theme";
import { Swatch } from "./icons";
import styles from "./site.module.css";
import type { SiteLabels } from "./labels";

/**
 * The theme, as three swatches where there is room and as one button that goes
 * to the next theme where there is not. The server cannot know the theme: until
 * hydration none is marked, and the single button shows the colours in use.
 */
export function ThemeControl({ labels }: { labels: SiteLabels["theme"] }) {
  const theme = useSiteTheme();
  const next = SITE_THEMES[(SITE_THEMES.indexOf(theme ?? "dusk") + 1) % SITE_THEMES.length];

  return (
    <>
      <div className={styles.swatches} role="group" aria-label={labels.label}>
        {SITE_THEMES.map((option) => (
          <HoloIconButton
            key={option}
            size="sm"
            label={labels.names[option]}
            title={labels.names[option]}
            aria-pressed={theme === null ? undefined : theme === option}
            data-theme-option={option}
            onClick={() => setSiteTheme(option)}
          >
            <Swatch theme={option} />
          </HoloIconButton>
        ))}
      </div>
      <HoloIconButton
        size="sm"
        className={styles.nextTheme}
        label={
          theme === null
            ? labels.label
            : labels.next.replace("{current}", labels.names[theme]).replace("{next}", labels.names[next])
        }
        // The cut stays the same whatever the theme is.
        seed={labels.label}
        data-theme-next=""
        onClick={() => setSiteTheme(next)}
      >
        <Swatch />
      </HoloIconButton>
    </>
  );
}
