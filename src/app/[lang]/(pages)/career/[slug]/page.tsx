import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, locales } from "@/i18n/config";
import { routeAlternates } from "@/lib/seo";
import { timeline, timelineBySlug } from "@/lib/timeline";
import { D, G, Row } from "@/components/terminal/primitives";
import s from "@/components/terminal/page.module.css";

type CareerDetail = {
  tagline: string;
  context: string;
  responsibilities: string[];
  achievements: string[];
  outcome: string;
};

type CareerDict = {
  details: Record<string, CareerDetail | undefined>;
  chrome: {
    context: string;
    responsibilities: string;
    achievements: string;
    outcome: string;
  };
};

export function generateStaticParams() {
  return locales.flatMap((lang) => timeline.map((t) => ({ lang, slug: t.slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/career/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const entry = timelineBySlug(slug);
  if (!entry || !hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const detail = (dict.career as CareerDict).details[entry.slug];
  return {
    title: `${entry.company} — Career`,
    description: detail?.tagline,
    alternates: routeAlternates(lang, `/career/${slug}`),
  };
}

/** `cat career/<slug>.log` — period/company/role/tech table, then the case in prose. */
export default async function CareerDetailPage({ params }: PageProps<"/[lang]/career/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const entry = timelineBySlug(slug);
  if (!entry) notFound();

  const dict = await getDictionary(lang);
  const career = dict.career as CareerDict;
  const detail = career.details[entry.slug];
  if (!detail) notFound();

  const labels = dict.terminal.pages.career;
  const role =
    (dict.about.timeline as Record<string, { role: string }>)[entry.key]?.role ?? entry.company;

  return (
    <article>
      <h1 className={s.h1} tabIndex={-1}>
        {role} <D>— {entry.company}</D>
      </h1>
      <p className={s.lead}>{detail.tagline}</p>

      <div className={s.table}>
        <Row width="w12" label={labels.labels.period}>
          {entry.period}
          {entry.current ? (
            <>
              {" "}
              <G>● {labels.current}</G>
            </>
          ) : null}
        </Row>
        <Row width="w12" label={labels.labels.company}>
          {entry.company}
        </Row>
        <Row width="w12" label={labels.labels.role}>
          {role}
        </Row>
        <Row width="w12" label={labels.labels.tech}>
          <D>{entry.tech.join(" · ")}</D>
        </Row>
      </div>

      <div className="prose-term">
        <h2>{career.chrome.context}</h2>
        <p>{detail.context}</p>

        <h2>{career.chrome.responsibilities}</h2>
        <ul>
          {detail.responsibilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{career.chrome.achievements}</h2>
        <ul>
          {detail.achievements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{career.chrome.outcome}</h2>
        <p>{detail.outcome}</p>
      </div>
    </article>
  );
}
