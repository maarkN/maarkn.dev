import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDictionary, hasLocale } from "@/i18n/config";
import { getPostBySlug } from "@/lib/ghost";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PostCover } from "@/components/blog/post-cover";
import { PostContent } from "@/components/blog/post-content";

export const revalidate = 300;
export const dynamicParams = true;

const DATE_LOCALE: Record<string, string> = {
  en: "en-US",
  "pt-BR": "pt-BR",
};

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

export default async function PostPage({
  params,
}: PageProps<"/[lang]/blog/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const dict = await getDictionary(lang);
  const intl = DATE_LOCALE[lang] ?? "en-US";
  const formattedDate = formatDate(post.publishedAt, intl);

  return (
    <>
      <Nav locale={lang} nav={dict.nav} themes={dict.themes} />
      <main className="border-t border-[var(--border)]">
        <article className="mx-auto w-full max-w-[860px] px-4 pt-24 pb-20 sm:px-6 sm:pt-32 sm:pb-32 md:px-12 md:pt-40">
          <Link
            href={`/${lang}/blog`}
            className="group inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={2.4}
            />
            {dict.blog.back}
          </Link>

          <header className="mt-10">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <time dateTime={post.publishedAt}>{formattedDate}</time>
              <span>·</span>
              <span>
                {post.readingTime || 1} {dict.blog.readingTime}
              </span>
              {post.tags.length > 0 ? (
                <>
                  <span>·</span>
                  <ul className="flex flex-wrap gap-1.5">
                    {post.tags.map((t) => (
                      <li
                        key={t.slug}
                        className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] tracking-[0.04em] text-[var(--text-2)]"
                      >
                        {t.name}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            <h1 className="mt-5 font-display text-[clamp(2.2rem,4vw,3.6rem)] font-bold leading-[1.06] tracking-[-0.03em] text-[var(--text)]">
              {post.title}
            </h1>
            {post.excerpt ? (
              <p className="mt-5 max-w-[60ch] text-[1.1rem] font-light leading-[1.7] text-[var(--text-2)]">
                {post.excerpt}
              </p>
            ) : null}
          </header>

          <div className="mt-12">
            <PostCover post={post} aspect="21/9" overlayLabel={post.slug} />
          </div>

          <div className="mt-12">
            <PostContent html={post.html} />
          </div>

          <footer className="mt-16 border-t border-[var(--border)] pt-8">
            <Link
              href={`/${lang}/blog`}
              className="group inline-flex items-center gap-2 font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
            >
              <ArrowLeft
                className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                strokeWidth={2.2}
              />
              {dict.blog.back}
            </Link>
          </footer>
        </article>
      </main>
      <Footer labels={dict.footer} socials={dict.social} />
    </>
  );
}

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
