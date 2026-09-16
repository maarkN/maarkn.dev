import { getDictionary, hasLocale, defaultLocale, type Locale } from "@/i18n/config";
import { getPostBySlug } from "@/lib/ghost";
import { OG_CONTENT_TYPE, OG_SIZE, terminalOgImage } from "@/lib/og";

export const alt = "Marco Filho — blog post";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 300;

/** `less blog/<slug>.md` as a social card: title, excerpt, reading time · tags. */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const l: Locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(l);
  const post = await getPostBySlug(slug);

  if (!post) {
    return terminalOgImage({
      locale: l,
      path: "~/blog",
      command: `less blog/${slug}.md`,
      title: dict.blog.title,
      subtitle: dict.blog.sub,
    });
  }

  const meta = [`${post.readingTime || 1} ${dict.blog.readingTime}`, ...post.tags.map((t) => t.name)];
  return terminalOgImage({
    locale: l,
    path: `~/blog/${slug}`,
    command: `less blog/${slug}.md`,
    title: post.title,
    subtitle: post.excerpt || undefined,
    lines: [meta.join(" · ")],
  });
}
