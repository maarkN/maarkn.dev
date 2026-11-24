"use client";

import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { BeamLink } from "@/components/holo/link";
import { site } from "@/lib/site";
import { ariaCurrent, PAGES, pageHref } from "@/lib/site/pages";
import { CliLink, useHomeLink } from "./links";
import type { SiteLabels } from "./labels";
import styles from "./site.module.css";

/** The foot of every page: pages, CLI version and contact. `#contact` lands here. */
export function SiteFooter({
  locale,
  labels,
  channels,
}: {
  locale: string;
  labels: SiteLabels;
  /** Names of the channels, from the `links` dictionary. */
  channels: Record<"email" | "linkedin" | "github" | "whatsapp" | "cv", { label: string }>;
}) {
  const pathname = usePathname();
  const home = useHomeLink(locale);
  const contact = [
    ["email", `mailto:${site.email}`],
    ["linkedin", site.social.linkedin],
    ["github", site.social.github],
    ["whatsapp", site.social.whatsapp],
    ["cv", site.cvPath],
  ] as const;

  return (
    <footer className={clsx("site-root site-island", styles.footer)}>
      <div className={styles.footerInner}>
        <nav aria-label={labels.footer.label}>
          <ul className={styles.footerLinks}>
            {PAGES.map((page) => (
              <li key={page}>
                <BeamLink
                  href={pageHref(locale, page)}
                  aria-current={ariaCurrent(pathname, page)}
                  {...(page === "home" && home)}
                >
                  {labels.pages[page]}
                </BeamLink>
              </li>
            ))}
          </ul>
          <CliLink locale={locale} size="sm" className={styles.footerCli}>
            <span className={styles.cliGlyph} aria-hidden="true">
              {">_"}
            </span>
            {labels.cli}
          </CliLink>
        </nav>

        <section id="contact" tabIndex={-1} aria-labelledby="contact-title" className={styles.footerContact}>
          <h2 id="contact-title">{labels.sections.contact}</h2>
          <p>{labels.footer.contact}</p>
          <ul className={styles.footerLinks}>
            {contact.map(([channel, href]) => (
              <li key={channel}>
                <BeamLink
                  href={href}
                  prefetch={false}
                  {...(channel !== "email" && { target: "_blank", rel: "noopener noreferrer" })}
                >
                  {channels[channel].label}
                </BeamLink>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </footer>
  );
}
