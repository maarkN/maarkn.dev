import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { timeline } from "@/lib/timeline";
import { experienceLines } from "@/lib/terminal/listings";
import s from "@/components/terminal/page.module.css";

export const metadata: Metadata = {
  title: "Career — every role at a glance",
  description:
    "Every role Marco Filho has shipped from, in chronological order — open any position for the full case.",
};

/** `ls career/` — the `experience` command as a page, one anchor per role. */
export default async function CareerIndexPage({ params }: PageProps<"/[lang]/career">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const labels = dict.terminal.pages.career;
  const copy = dict.about.timeline as Record<string, { role: string; summary: string }>;

  const items = timeline.map((entry) => ({
    slug: entry.slug,
    period: entry.period,
    company: entry.company,
    role: copy[entry.key]?.role ?? entry.company,
    summary: copy[entry.key]?.summary ?? "",
    current: entry.current,
  }));

  return (
    <>
      <h1 className={s.h1} tabIndex={-1}>
        {labels.title}
      </h1>
      <p className={s.lead}>{labels.sub}</p>

      <p className={s.meta}>{labels.header}</p>

      {experienceLines(items, { lang, readCase: labels.readCase })}
    </>
  );
}
