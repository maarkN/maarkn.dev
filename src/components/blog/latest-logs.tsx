import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { getPosts, type Post } from "@/lib/ghost";
import { PostCover } from "./post-cover";

type Labels = {
  kicker: string;
  title: string;
  sub: string;
  seeAll: string;
  featured: string;
  readingTime: string;
};

const DATE_LOCALE: Record<string, string> = { en: "en-US", "pt-BR": "pt-BR" };

export async function LatestLogs({
  locale,
  labels,
}: {
  locale: string;
  labels: Labels;
}) {
  const posts = await getPosts(4);
  if (posts.length === 0) return null;

  const intl = DATE_LOCALE[locale] ?? "en-US";
  const featured = posts[0]!;
  const rest = posts.slice(1);

  return (
    <section
      id="logs"
      className="relative border-t border-[var(--border)]"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24 md:px-12 md:py-32">
        <div className="mb-12 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="dev-kicker font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
              <span className="light-only-text">{labels.kicker}</span>
              <span className="dev-only-text">Ghost CMS integration</span>
            </p>
            <h2 className="dev-section-title mt-3 font-display text-[clamp(2rem,3.6vw,3.2rem)] font-bold leading-[1.1] tracking-[-0.025em] text-[var(--text)]">
              <span className="light-only-text">{labels.title}</span>
              <span className="dev-only-text">Latest Logs</span>
            </h2>
            <p className="mt-4 max-w-xl text-[1.02rem] font-light leading-[1.75] text-[var(--text-2)]">
              {labels.sub}
            </p>
          </div>
          <Link
            href={`/${locale}/blog`}
            className="group inline-flex items-center gap-2 self-start border border-[var(--border-2)] px-5 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] md:self-end"
          >
            {labels.seeAll}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.2}
            />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <FeaturedCard
            post={featured}
            locale={locale}
            featuredLabel={labels.featured}
            readingTime={labels.readingTime}
            intl={intl}
          />
          <ul className="flex flex-col gap-4">
            {rest.map((post) => (
              <li key={post.slug}>
                <SmallCard
                  post={post}
                  locale={locale}
                  readingTime={labels.readingTime}
                  intl={intl}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FeaturedCard({
  post,
  locale,
  featuredLabel,
  readingTime,
  intl,
}: {
  post: Post;
  locale: string;
  featuredLabel: string;
  readingTime: string;
  intl: string;
}) {
  return (
    <Link
      href={`/${locale}/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)]"
    >
      <div className="relative">
        <PostCover post={post} aspect="16/9" overlayLabel={featuredLabel} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
        {post.tags.length > 0 ? (
          <span className="self-start border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            {post.tags[0]!.name}
          </span>
        ) : null}
        <h3 className="font-display text-[1.5rem] font-bold leading-[1.2] tracking-tight text-[var(--text)] transition-colors group-hover:text-[var(--accent)]">
          {post.title}
        </h3>
        <p className="text-[14px] font-light leading-[1.7] text-[var(--text-2)]">
          {post.excerpt}
        </p>
        <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, intl)}</time>
          <span>·</span>
          <span>
            {post.readingTime || 1} {readingTime}
          </span>
          <ArrowUpRight
            className="ml-auto h-4 w-4 text-[var(--muted)] transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)]"
            strokeWidth={2.2}
          />
        </div>
      </div>
    </Link>
  );
}

function SmallCard({
  post,
  locale,
  readingTime,
  intl,
}: {
  post: Post;
  locale: string;
  readingTime: string;
  intl: string;
}) {
  return (
    <Link
      href={`/${locale}/blog/${post.slug}`}
      className="group flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]"
    >
      {post.tags.length > 0 ? (
        <span className="self-start border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
          {post.tags[0]!.name}
        </span>
      ) : null}
      <h3 className="font-display text-[1.05rem] font-semibold leading-[1.3] tracking-tight text-[var(--text)] transition-colors group-hover:text-[var(--accent)]">
        {post.title}
      </h3>
      <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, intl)}</time>
        <span>·</span>
        <span>
          {post.readingTime || 1} {readingTime}
        </span>
      </div>
    </Link>
  );
}

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short" }).format(
      new Date(iso)
    );
  } catch {
    return iso.slice(0, 7);
  }
}
