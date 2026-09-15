import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { getDictionary, hasLocale } from "@/i18n/config";
import { getAllProjects, buildTaglines, projectCategories } from "@/lib/projects-repo";
import type { ProjectCategory } from "@/lib/projects";
import { projectsLines } from "@/lib/terminal/listings";
import { D } from "@/components/terminal/primitives";
import s from "@/components/terminal/page.module.css";
import t from "@/components/terminal/terminal.module.css";

export const metadata: Metadata = {
  title: "Selected work",
  description:
    "Every product Marco Filho is willing to put his name on — filtered by category.",
};

export const dynamic = "force-dynamic";

/** Order of the inline filter; every entry must exist in `projectCategories`. */
const FILTER_ORDER: ProjectCategory[] = ["ai", "web", "backend", "mobile", "client"];

const isCategory = (v: unknown): v is ProjectCategory =>
  typeof v === "string" && (projectCategories as string[]).includes(v);

/**
 * `ls projects/` — every project in the format of the `projects` command.
 * `?cat=<category>` filters on the server; an unknown value shows everything.
 */
export default async function ProjectsIndexPage({
  params,
  searchParams,
}: PageProps<"/[lang]/projects">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const { cat } = await searchParams;
  const active = isCategory(cat) ? cat : null;

  const dict = await getDictionary(lang);
  const p = dict.projects;
  const labels = dict.terminal.pages.projects;
  const all = await getAllProjects();
  const taglines = buildTaglines(all, p.taglines);
  const shown = active ? all.filter((project) => project.category === active) : all;

  const header = active
    ? labels.headerFiltered
        .replace("{count}", String(shown.length))
        .replace("{total}", String(all.length))
        .replace("{category}", p.categories[active])
    : labels.header.replace("{count}", String(all.length));

  return (
    <>
      <h1 className={s.h1} tabIndex={-1}>
        {p.page.title}
      </h1>
      <p className={s.lead}>{p.page.sub}</p>

      <p className={s.meta}>{header}</p>

      <nav className={s.filter} aria-label={labels.filter}>
        {labels.filter}:{" "}
        <FilterLink href={`/${lang}/projects`} active={active === null}>
          {labels.all}
        </FilterLink>
        {FILTER_ORDER.map((category) => (
          <span key={category}>
            {" · "}
            <FilterLink href={`/${lang}/projects?cat=${category}`} active={active === category}>
              {category}
            </FilterLink>
          </span>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className={s.line}>
          <D>{p.page.empty}</D>
        </p>
      ) : (
        projectsLines(
          shown.map((project) => ({
            slug: project.slug,
            name: project.name,
            year: project.year,
            category: project.category,
            status: project.status,
            stack: project.stack,
            tagline: taglines[project.slug] ?? "",
          })),
          { lang, categories: p.categories, statuses: p.statuses },
        )
      )}
    </>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(t.link, active ? s.filterOn : t.quiet)}
      aria-current={active ? "true" : undefined}
    >
      {children}
    </Link>
  );
}
