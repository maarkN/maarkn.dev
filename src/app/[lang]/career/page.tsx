import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CareerStream } from "@/components/career-stream";

export const metadata: Metadata = {
  title: "Career — every role at a glance",
  description:
    "A vertical parallax that walks you through every role Marco Filho has shipped from, in chronological order.",
};

export default async function CareerIndexPage({
  params,
}: PageProps<"/[lang]/career">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const careerDict = (dict as { career?: unknown }).career as
    | {
        details: Record<string, {
          tagline: string;
          context: string;
          responsibilities: string[];
          achievements: string[];
          outcome: string;
        }>;
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
  if (!careerDict) notFound();

  const stream = (dict as { careerStream?: unknown }).careerStream as
    | {
        intro: { kicker: string; title: string; sub: string; scrollHint: string };
        readFull: string;
      }
    | undefined;
  if (!stream) notFound();

  const roles: Record<string, string> = {};
  for (const [k, v] of Object.entries(
    dict.about.timeline as Record<string, { role: string }>
  )) {
    roles[k] = v.role;
  }

  return (
    <>
      <Nav locale={lang} nav={dict.nav} themes={dict.themes} />
      <main>
        <CareerStream
          locale={lang}
          labels={{
            intro: stream.intro,
            chrome: careerDict.chrome,
            details: careerDict.details,
            roles,
            readFull: stream.readFull,
          }}
        />
      </main>
      <Footer labels={dict.footer} socials={dict.social} />
    </>
  );
}
