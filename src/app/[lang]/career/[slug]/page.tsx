import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, locales } from "@/i18n/config";
import { timeline, timelineBySlug } from "@/lib/timeline";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CareerDetailView } from "@/components/career-detail";

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    timeline.map((t) => ({ lang, slug: t.slug }))
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/career/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const entry = timelineBySlug(slug);
  if (!entry || !hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const detail = (
    (dict as { career?: { details?: Record<string, { tagline: string }> } }).career?.details
  )?.[entry.slug];
  return {
    title: `${entry.company} — Career`,
    description: detail?.tagline,
  };
}

export default async function CareerDetailPage({
  params,
}: PageProps<"/[lang]/career/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const entry = timelineBySlug(slug);
  if (!entry) notFound();

  const dict = await getDictionary(lang);
  const careerDict = (dict as { career?: unknown }).career as
    | {
        details: Record<
          string,
          {
            tagline: string;
            context: string;
            responsibilities: string[];
            achievements: string[];
            outcome: string;
          }
        >;
        chrome: {
          back: string;
          context: string;
          responsibilities: string;
          achievements: string;
          outcome: string;
          stackHeading: string;
          periodLabel: string;
          companyLabel: string;
        };
      }
    | undefined;

  const detail = careerDict?.details?.[entry.slug];
  const roleLabel =
    (dict.about.timeline as Record<string, { role: string }>)[entry.key]?.role ??
    entry.company;
  if (!detail || !careerDict) notFound();

  return (
    <>
      <Nav locale={lang} nav={dict.nav} themes={dict.themes} />
      <main className="border-t border-[var(--border)]">
        <CareerDetailView
          entry={entry}
          detail={detail}
          chrome={careerDict.chrome}
          locale={lang}
          roleLabel={`${roleLabel} — ${entry.company}`}
        />
      </main>
      <Footer labels={dict.footer} socials={dict.social} />
    </>
  );
}
