import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ProjectsFilter } from "@/components/projects-filter";

export const metadata: Metadata = {
  title: "Selected work",
  description:
    "Every product Marco Filho is willing to put his name on — filtered by category.",
};

export default async function ProjectsIndexPage({
  params,
}: PageProps<"/[lang]/projects">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const p = dict.projects;

  return (
    <>
      <Nav locale={lang} nav={dict.nav} themes={dict.themes} />
      <main className="border-t border-[var(--border)]">
        <section className="mx-auto w-full max-w-[1280px] px-4 pt-24 pb-8 sm:px-6 sm:pt-32 sm:pb-12 md:px-12 md:pt-40">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
            {p.page.kicker}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--text)]">
            {p.page.title}
          </h1>
          <p className="mt-6 max-w-2xl text-[1.05rem] font-light leading-[1.75] text-[var(--text-2)]">
            {p.page.sub}
          </p>
        </section>

        <section className="mx-auto w-full max-w-[1280px] px-4 pb-20 sm:px-6 sm:pb-32 md:px-12">
          <ProjectsFilter
            labels={{
              filterAll: p.page.filterAll,
              empty: p.page.empty,
              view: p.view,
              categories: p.categories,
              statuses: p.statuses,
              taglines: p.taglines,
            }}
          />
        </section>
      </main>
      <Footer labels={dict.footer} socials={dict.social} />
    </>
  );
}
