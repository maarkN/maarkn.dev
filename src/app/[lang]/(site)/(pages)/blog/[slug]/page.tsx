import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { getPostBySlug } from "@/lib/ghost";
import { sanitizePostHtml } from "@/lib/sanitize-post-html";
import { routeAlternates } from "@/lib/seo";
import { D } from "@/components/terminal/primitives";
import s from "@/components/terminal/page.module.css";

export const revalidate = 300;
export const dynamicParams = true;

const DATE_LOCALE: Record<string, string> = {
  en: "en-US",
  "pt-BR": "pt-BR",
};

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/blog/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: routeAlternates(lang, `/blog/${slug}`),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

/**
 * `less blog/<slug>.md` — title, date · reading time · tags, excerpt and the
 * post body in monospace prose.
 *
 * The body is EXTERNAL HTML: Ghost is a hosted CMS with its own login and its
 * own CVEs, and this page shares an origin with `/admin`, where the session
 * cookie lives. One hostile post would otherwise run script in that origin, so
 * the HTML goes through `sanitizePostHtml` (server-side allowlist) before it
 * is ever handed to `dangerouslySetInnerHTML` — a CSP is containment on top,
 * not a replacement. See `@/lib/sanitize-post-html`.
 */
export default async function PostPage({ params }: PageProps<"/[lang]/blog/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const dict = await getDictionary(lang);
  const formattedDate = formatDate(post.publishedAt, DATE_LOCALE[lang] ?? "en-US");

  return (
    <article>
      <header>
        <h1 className={s.h1} tabIndex={-1}>
          {post.title}
        </h1>
        <p className={s.meta}>
          <time dateTime={post.publishedAt}>{formattedDate}</time>
          {" · "}
          {post.readingTime || 1} {dict.blog.readingTime}
          {post.tags.length > 0 ? (
            <>
              {" · "}
              {post.tags.map((t) => t.name).join(" · ")}
            </>
          ) : null}
        </p>
        {post.excerpt ? (
          <p className={s.lead}>
            <D>{post.excerpt}</D>
          </p>
        ) : null}
      </header>

      <div
        className="prose-term"
        dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.html) }}
      />
    </article>
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
