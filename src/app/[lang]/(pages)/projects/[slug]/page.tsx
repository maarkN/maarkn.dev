import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { getProjectBySlug } from "@/lib/projects-repo";
import { projectStatus } from "@/lib/terminal/listings";
import { A, D, Row } from "@/components/terminal/primitives";
import s from "@/components/terminal/page.module.css";

export const dynamic = "force-dynamic";

type Detail = { description: string; role: string; features: string[] };

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

/**
 * `cat projects/<slug>.md` — name, metadata table (year, category, status,
 * stack, links), then description, role and features in prose and a plain
 * gallery. Private repos say so instead of linking.
 */
export default async function ProjectDetailPage({ params }: PageProps<"/[lang]/projects/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const dict = await getDictionary(lang);
  const p = dict.projects;
  const labels = dict.terminal.pages.projects;

  const detail: Detail = (p.details as Record<string, Detail | undefined>)[slug] ?? {
    description: project.description ?? "",
    role: project.role ?? "",
    features: project.features ?? [],
  };
  const tagline = (p.taglines as Record<string, string>)[slug] ?? project.tagline ?? "";
  const captions = (p.gallery as Record<string, Record<string, string> | undefined>)[slug];

  const isPrivate = project.sourceVisibility === "private";
  const demo = project.links?.demo;
  const repo = !isPrivate ? project.links?.repo : undefined;
  const gallery = project.gallery ?? [];

  return (
    <article>
      <h1 className={s.h1} tabIndex={-1}>
        {project.name}
      </h1>
      <p className={s.lead}>{tagline}</p>

      <div className={s.table}>
        <Row width="w12" label={labels.labels.year}>
          {project.year}
        </Row>
        <Row width="w12" label={labels.labels.category}>
          {p.categories[project.category]}
        </Row>
        <Row width="w12" label={labels.labels.status}>
          {projectStatus(project.status, p.statuses)}
        </Row>
        <Row width="w12" label={labels.labels.stack}>
          <D>{project.stack.join(" · ")}</D>
        </Row>
        <Row width="w12" label={labels.labels.links}>
          {demo ? <A href={demo}>{labels.openLive}</A> : null}
          {demo && (repo || isPrivate) ? " · " : null}
          {repo ? <A href={repo}>{labels.viewRepo}</A> : null}
          {isPrivate ? (
            <D>
              {labels.privateRepo} · {p.privateNote}
            </D>
          ) : null}
          {!demo && !repo && !isPrivate ? <D>{p.noLinks}</D> : null}
        </Row>
      </div>

      <div className="prose-term">
        {detail.description ? <p>{detail.description}</p> : null}

        {detail.role ? (
          <>
            <h2>{p.roleHeading}</h2>
            <p>{detail.role}</p>
          </>
        ) : null}

        {detail.features.length > 0 ? (
          <>
            <h2>{p.featuresHeading}</h2>
            <ul>
              {detail.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {gallery.length > 0 ? (
        <section className={s.section} aria-labelledby="gallery">
          <h2 id="gallery" className={s.h2}>
            {p.galleryHeading}
          </h2>
          <ul className={s.gallery}>
            {gallery.map((shot, i) => {
              const caption = shot.captionKey ? captions?.[shot.captionKey] : undefined;
              const alt = caption ?? `${project.name} · ${i + 1}`;
              return (
                <li key={`${shot.url}-${i}`}>
                  <figure>
                    {shot.url ? (
                      <Image
                        src={shot.url}
                        alt={alt}
                        width={1280}
                        height={720}
                        sizes="(min-width: 720px) 82ch, 100vw"
                      />
                    ) : (
                      <div className={s.shot} role="img" aria-label={alt}>
                        [{shot.monogram ?? project.monogram}]
                      </div>
                    )}
                    {caption ? <figcaption>{caption}</figcaption> : null}
                  </figure>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
