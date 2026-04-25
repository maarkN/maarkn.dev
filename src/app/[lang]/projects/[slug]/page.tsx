import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, locales } from "@/i18n/config";
import { projects } from "@/lib/projects";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ProjectDetail } from "@/components/project-detail";

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    projects.map((p) => ({ lang, slug: p.slug }))
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/projects/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project || !hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const tagline = (dict.projects.taglines as Record<string, string>)[slug] ?? "";
  return { title: project.name, description: tagline };
}

export default async function ProjectDetailPage({
  params,
}: PageProps<"/[lang]/projects/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const dict = await getDictionary(lang);
  const p = dict.projects;
  const detail = (p.details as Record<string, typeof p.details[keyof typeof p.details] | undefined>)[slug];
  if (!detail) notFound();

  const galleryCaptions = (
    p.gallery as Record<string, Record<string, string>> | undefined
  )?.[slug];

  return (
    <>
      <Nav locale={lang} nav={dict.nav} themes={dict.themes} />
      <main>
        <ProjectDetail
          project={project}
          locale={lang}
          labels={{
            back: p.back,
            viewLive: p.viewLive,
            viewRepo: p.viewRepo,
            noLinks: p.noLinks,
            privateLabel: (p as { privateLabel?: string }).privateLabel ?? "Private project",
            privateNote:
              (p as { privateNote?: string }).privateNote ??
              "Source code is not public.",
            galleryHeading:
              (p as { galleryHeading?: string }).galleryHeading ?? "From the project",
            roleHeading: p.roleHeading,
            featuresHeading: p.featuresHeading,
            stackHeading: p.stackHeading,
            tagline: (p.taglines as Record<string, string>)[slug] ?? "",
            detail,
            galleryCaptions,
            categories: p.categories,
            statuses: p.statuses,
          }}
        />
      </main>
      <Footer labels={dict.footer} socials={dict.social} />
    </>
  );
}
