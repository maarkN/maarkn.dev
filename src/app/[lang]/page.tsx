import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, defaultLocale } from "@/i18n/config";
import { languageAlternates } from "@/lib/seo";
import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { BigNumbers } from "@/components/big-numbers";
import { About } from "@/components/about";
import { Toolkit } from "@/components/toolkit";
import { Projects } from "@/components/projects";
import { getFeaturedProjects, buildTaglines } from "@/lib/projects-repo";
import { Contact } from "@/components/contact";
import { LatestLogs } from "@/components/blog/latest-logs";
import { Footer } from "@/components/footer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const l = hasLocale(lang) ? lang : defaultLocale;
  return {
    alternates: { canonical: `/${l}`, languages: languageAlternates },
  };
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const featured = await getFeaturedProjects();
  const projectsLabels = {
    ...dict.projects,
    taglines: buildTaglines(featured, dict.projects.taglines),
  };

  return (
    <>
      <Nav locale={lang} nav={dict.nav} themes={dict.themes} />
      <main>
        <Hero labels={dict.hero} cardLabels={dict.card} />
        <BigNumbers labels={dict.bigNumbers} />
        <About labels={dict.about} locale={lang} />
        <Projects locale={lang} labels={projectsLabels} projects={featured} />
        <Toolkit labels={dict.toolkit} />
        <Contact labels={dict.contact} />
        <LatestLogs locale={lang} labels={dict.latestLogs} />
      </main>
      <Footer labels={dict.footer} socials={dict.social} />
    </>
  );
}
