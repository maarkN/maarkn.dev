import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { routeAlternates } from "@/lib/seo";
import { site } from "@/lib/site";
import { A, D, G, P, Row } from "@/components/terminal/primitives";
import s from "@/components/terminal/page.module.css";
import t from "@/components/terminal/terminal.module.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/links">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: "Links",
    description: "All the ways to find and reach Marco Filho on the internet.",
    alternates: routeAlternates(lang, "/links"),
  };
}

const strip = (url: string) => url.replace(/^https?:\/\//i, "");

/** `cat links.sh` — every channel as a row, plus availability. No photo. */
export default async function LinksPage({ params }: PageProps<"/[lang]/links">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const labels = dict.links;
  const rows = dict.terminal.pages.links.labels;
  const l = labels.links;

  return (
    <>
      <h1 className={s.h1} tabIndex={-1}>
        {labels.name} <D>· {site.nick}</D>
      </h1>
      <p className={s.meta}>
        <P>{labels.role}</P>
      </p>
      <p className={s.lead}>{labels.bio}</p>

      <div className={s.table}>
        <Row width="w10" label={rows.email}>
          <A href={`mailto:${site.email}`}>{site.email}</A> <D>· {l.email.label}</D>
        </Row>
        <Row width="w10" label={rows.linkedin}>
          <A href={site.social.linkedin}>{strip(site.social.linkedin)}</A>{" "}
          <D>· {l.linkedin.label}</D>
        </Row>
        <Row width="w10" label={rows.github}>
          <A href={site.social.github}>{strip(site.social.github)}</A> <D>· {l.github.label}</D>
        </Row>
        <Row width="w10" label={rows.whatsapp}>
          <A href={site.social.whatsapp}>{site.phone}</A> <D>· {l.whatsapp.label}</D>
        </Row>
        <Row width="w10" label={rows.cv}>
          <a href={site.cvPath} target="_blank" rel="noopener noreferrer" className={t.link}>
            {site.cvPath.split("/").pop()}
          </a>{" "}
          <D>
            · {l.cv.label} · {l.cv.hint}
          </D>
        </Row>
        <Row width="w10" label={rows.instagram}>
          <A href={site.social.instagram}>{strip(site.social.instagram)}</A>{" "}
          <D>· {l.instagram.label}</D>
        </Row>
      </div>

      <Row width="w10" label={rows.status}>
        <G>● {labels.available}</G>
      </Row>
    </>
  );
}
