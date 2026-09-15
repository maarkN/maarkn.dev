import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { getPosts } from "@/lib/ghost";
import { writingLines } from "@/lib/terminal/listings";
import { D } from "@/components/terminal/primitives";
import s from "@/components/terminal/page.module.css";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Field notes from Marco Filho on building products, AI, architecture and the discipline of shipping.",
};

/** `ls blog/` — the same list the `writing` command prints, every post. */
export default async function BlogIndexPage({ params }: PageProps<"/[lang]/blog">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const labels = dict.terminal.pages.writing;
  const posts = await getPosts(20);

  return (
    <>
      <h1 className={s.h1} tabIndex={-1}>
        {dict.blog.title}
      </h1>
      <p className={s.lead}>{dict.blog.sub}</p>

      <p className={s.meta}>{labels.header}</p>

      {posts.length === 0 ? (
        <p className={s.line}>
          <D>{dict.blog.empty}</D>
        </p>
      ) : (
        <>
          {writingLines(
            posts.map((post) => ({
              slug: post.slug,
              title: post.title,
              tags: post.tags.map((t) => t.name),
              publishedAt: post.publishedAt,
              readingTime: post.readingTime,
            })),
            { lang, minRead: dict.blog.readingTime },
          )}
          <p className={s.line}>
            <D>{labels.count.replace("{count}", String(posts.length))}</D>
          </p>
        </>
      )}
    </>
  );
}
