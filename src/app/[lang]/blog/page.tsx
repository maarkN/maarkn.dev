import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { getPosts } from "@/lib/ghost";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/blog/post-card";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Field notes from Marco Filho on building products, AI, architecture and the discipline of shipping.",
};

const DATE_LOCALE: Record<string, string> = {
  en: "en-US",
  "pt-BR": "pt-BR",
};

export default async function BlogIndexPage({ params }: PageProps<"/[lang]/blog">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const posts = await getPosts(20);
  const intl = DATE_LOCALE[lang] ?? "en-US";

  return (
    <>
      <Nav locale={lang} nav={dict.nav} themes={dict.themes} />
      <main className="border-t border-[var(--border)]">
        <section className="mx-auto w-full max-w-[1280px] px-4 pt-24 pb-8 sm:px-6 sm:pt-32 sm:pb-12 md:px-12 md:pt-40">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
            {dict.blog.kicker}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--text)]">
            {dict.blog.title}
          </h1>
          <p className="mt-6 max-w-2xl text-[1.05rem] font-light leading-[1.75] text-[var(--text-2)]">
            {dict.blog.sub}
          </p>
        </section>

        <section className="mx-auto w-full max-w-[1280px] px-4 pb-20 sm:px-6 sm:pb-32 md:px-12">
          {posts.length === 0 ? (
            <p className="border border-dashed border-[var(--border-2)] p-12 text-center text-sm text-[var(--muted)]">
              {dict.blog.empty}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <PostCard
                  key={post.slug}
                  post={post}
                  index={i}
                  locale={lang}
                  readingTimeSuffix={dict.blog.readingTime}
                  dateLocale={intl}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer labels={dict.footer} socials={dict.social} />
    </>
  );
}
