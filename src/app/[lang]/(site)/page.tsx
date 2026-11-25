import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, defaultLocale } from "@/i18n/config";
import { BeamLink } from "@/components/holo/link";
import { HomeScroll } from "@/components/site/home-scroll";
import { SectionLink } from "@/components/site/links";
import styles from "@/components/site/site.module.css";
import { routeAlternates } from "@/lib/seo";
import { site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: routeAlternates(hasLocale(lang) ? lang : defaultLocale) };
}

/** The home. Only the opening so far: the sections are `rebrand-03-home`. */
export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const t = dict.site.opening;
  const { years, projects, stacks } = dict.bigNumbers.items;

  return (
    <main id="content" tabIndex={-1} className={`site-root ${styles.home}`}>
      <HomeScroll />
      <section className={styles.opening} aria-labelledby="opening-title">
        <p className={styles.who}>
          {site.available && <span className={styles.dot} aria-hidden="true" />}
          <strong>{site.name}</strong>
          {site.available && ` · ${t.available}`}
        </p>
        <h1 id="opening-title" tabIndex={-1}>
          {t.title}
        </h1>
        <p className={styles.lead}>{dict.links.bio}</p>
        <p className={styles.actions}>
          <SectionLink locale={lang} section="contact" size="lg" variant="primary">
            {dict.site.contact}
          </SectionLink>
          <BeamLink href={site.cvPath} prefetch={false} target="_blank" rel="noopener noreferrer">
            {dict.links.links.cv.label}
          </BeamLink>
        </p>
        <dl className={styles.numbers} aria-label={t.numbers}>
          {[years, projects, stacks].map(({ value, label }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
