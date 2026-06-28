import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { getProjectBySlug } from "@/lib/projects-repo";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ProjectDetail } from "@/components/project-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/projects/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  const dict = await getDictionary(lang);
  const tagline =
    (dict.projects.taglines as Record<string, string>)[slug] ?? project.tagline ?? "";
  return { title: project.name, description: tagline };
}

export default async function ProjectDetailPage({
  params,
}: PageProps<"/[lang]/projects/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const dict = await getDictionary(lang);
  const p = dict.projects;
  const dictDetail = (
    p.details as Record<
      string,
      { description: string; role: string; features: string[] } | undefined
    >
  )[slug];
  const detail = dictDetail ?? {
    description: project.description ?? "",
    role: project.role ?? "",
    features: project.features ?? [],
  };
  const tagline =
    (p.taglines as Record<string, string>)[slug] ?? project.tagline ?? "";

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
            tagline,
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
