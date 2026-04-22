"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { Post } from "@/lib/ghost";
import { PostCover } from "./post-cover";

export function PostCard({
  post,
  index,
  locale,
  readingTimeSuffix,
  dateLocale,
}: {
  post: Post;
  index: number;
  locale: string;
  readingTimeSuffix: string;
  dateLocale: string;
}) {
  const formattedDate = formatDate(post.publishedAt, dateLocale);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.25), ease: "easeOut" }}
      className="group relative flex flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)]"
    >
      <Link href={`/${locale}/blog/${post.slug}`} className="flex flex-1 flex-col" aria-label={post.title}>
        <PostCover post={post} aspect="16/9" />
        <div className="flex flex-1 flex-col gap-4 p-6">
          <header>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <time dateTime={post.publishedAt}>{formattedDate}</time>
              <span>·</span>
              <span>
                {post.readingTime || 1} {readingTimeSuffix}
              </span>
            </div>
            <h3 className="mt-3 font-display text-[1.25rem] font-bold leading-[1.2] tracking-tight text-[var(--text)] transition-colors group-hover:text-[var(--accent)]">
              {post.title}
            </h3>
          </header>

          <p className="text-[14px] font-light leading-[1.7] text-[var(--text-2)]">
            {post.excerpt}
          </p>

          <footer className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
            <ul className="flex flex-wrap gap-1.5">
              {post.tags.slice(0, 3).map((t) => (
                <li
                  key={t.slug}
                  className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] tracking-[0.04em] text-[var(--text-2)]"
                >
                  {t.name}
                </li>
              ))}
            </ul>
            <ArrowUpRight
              className="h-4 w-4 text-[var(--muted)] transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)]"
              strokeWidth={2.2}
            />
          </footer>
        </div>
      </Link>

      <span
        className="pointer-events-none absolute bottom-0 left-0 h-px w-0 bg-[var(--accent)] transition-[width] duration-500 group-hover:w-full"
        aria-hidden
      />
    </motion.article>
  );
}

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
