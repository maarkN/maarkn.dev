import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { BaseMenu } from "@/components/site/base-menu";
import { chromeLabels } from "@/components/site/labels";
import { PagePassage } from "@/components/site/page-passage";
import { PageTransition } from "@/components/site/page-transition";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteTop } from "@/components/site/site-top";
import styles from "@/components/site/site.module.css";
import { SiteThemeSync } from "@/components/site-theme";
import { site } from "@/lib/site";
import { siteFontVars } from "../../site-fonts";
import "../../site.css";

/**
 * Every page of the site: skip link, top, the page, foot and, where the top
 * has no room for them, the pages at the base of the screen. One layout for
 * all of them, so none of it is rebuilt on the way from one page to another.
 *
 * The chrome is dressed by itself (`site-island`): the pages under `(pages)`
 * still wear the CLI version's look, until their own changes redesign them. A
 * page that is already the site's is wrapped in `.site-root`.
 */
export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const labels = chromeLabels(dict.site);

  return (
    <div className={siteFontVars}>
      <SiteThemeSync />
      <a href="#content" className={`site-root site-island ${styles.skip}`}>
        {labels.skip}
      </a>
      <SiteTop locale={lang} labels={labels} available={site.available} />
      <PageTransition>{children}</PageTransition>
      <SiteFooter locale={lang} labels={labels} channels={dict.links.links} />
      <BaseMenu locale={lang} labels={labels} />
      <PagePassage />
    </div>
  );
}
