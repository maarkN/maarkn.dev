import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { langAttr } from "@/lib/project-text";
import { getProjectBySlug } from "@/lib/projects-repo";
import { routeAlternates } from "@/lib/seo";
import { projectStatus } from "@/lib/terminal/listings";
import { A, D, Row } from "@/components/terminal/primitives";
import s from "@/components/terminal/page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/projects/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const project = await getProjectBySlug(slug, lang);
  if (!project) return {};
  return {
    title: project.name,
    description: project.tagline?.value ?? "",
    alternates: routeAlternates(lang, `/projects/${slug}`),
  };
}

/**
 * `cat projects/<slug>.md` — name, metadata table (year, category, status,
 * stack, links), then description, role and features in prose and a plain
 * gallery. Private repos say so instead of linking. Text that only exists in the
 * other language is shown in it, with its `lang`.
 */
export default async function ProjectDetailPage({ params }: PageProps<"/[lang]/projects/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const project = await getProjectBySlug(slug, lang);
  if (!project) notFound();

  const dict = await getDictionary(lang);
  const p = dict.projects;
  const labels = dict.terminal.pages.projects;

  const { tagline, description, role, features, gallery } = project;

  const isPrivate = project.sourceVisibility === "private";
  const demo = project.links?.demo;
  const repo = !isPrivate ? project.links?.repo : undefined;

  return (
    <article>
      <h1 className={s.h1} tabIndex={-1}>
        {project.name}
      </h1>
      {tagline ? (
        <p className={s.lead} lang={langAttr(tagline, lang)}>
          {tagline.value}
        </p>
      ) : null}

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
        {description ? <p lang={langAttr(description, lang)}>{description.value}</p> : null}

        {role ? (
          <>
            <h2>{p.roleHeading}</h2>
            <p lang={langAttr(role, lang)}>{role.value}</p>
          </>
        ) : null}

        {features ? (
          <>
            <h2>{p.featuresHeading}</h2>
            <ul lang={langAttr(features, lang)}>
              {features.value.map((feature) => (
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
              const { caption } = shot;
              const alt = caption?.value ?? `${project.name} · ${i + 1}`;
              return (
                <li key={`${shot.url}-${i}`}>
                  <figure lang={langAttr(caption, lang)}>
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
                    {caption ? <figcaption>{caption.value}</figcaption> : null}
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
