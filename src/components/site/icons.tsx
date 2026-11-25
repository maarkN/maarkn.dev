import { SITE_THEME_SWATCH, type SiteTheme } from "@/lib/site-theme";
import styles from "./site.module.css";

/** The mark: an M drawn twice, as a hologram is. Decorative; the name is text beside it. */
export function Mark() {
  return (
    <svg className={styles.mark} viewBox="0 0 30 30" aria-hidden="true" focusable="false">
      <path d="M2 27V10l7-7 6 6 6-6 7 7v13" />
      <path d="M8 27V15l7 7 7-7v8" className={styles.markInner} />
      <path d="M28 26.5v1.5" />
    </svg>
  );
}

/** A theme by its two colours; without one, the colours of the theme that is on. */
export function Swatch({ theme }: { theme?: SiteTheme }) {
  const [beam, page] = theme ? SITE_THEME_SWATCH[theme] : ["var(--beam)", "var(--bg)"];
  return (
    <span
      className={styles.swatch}
      style={{ background: `linear-gradient(135deg, ${beam} 50%, ${page} 50%)` }}
      aria-hidden="true"
    />
  );
}
