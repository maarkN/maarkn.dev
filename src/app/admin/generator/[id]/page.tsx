import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Generation · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Tiny, dependency-free Markdown → HTML for the print view (admin-only input). */
function renderMarkdown(md: string): string {
  const lines = escapeHtml(md).split("\n");
  const html: string[] = [];
  let inList = false;
  let para: string[] = [];
  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };
  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      const level = Math.min(h[1].length, 4);
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
    } else if (li) {
      flushPara();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(li[1])}</li>`);
    } else if (line.trim() === "") {
      flushPara();
      closeList();
    } else {
      para.push(line);
    }
  }
  flushPara();
  closeList();
  return html.join("\n");
}

export default async function GenerationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const g = await db.generation.findUnique({ where: { id } });
  if (!g) notFound();

  const sections = [
    { heading: "Résumé", body: g.resume },
    { heading: "Cover letter", body: g.coverLetter },
    { heading: "Screening answers", body: g.screeningAnswers },
  ].filter((s) => s.body && s.body.trim());

  return (
    <div className="min-h-dvh bg-neutral-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 px-4 print:hidden">
        <Link
          href="/admin/generator"
          className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 transition-colors hover:text-neutral-900"
        >
          ← Back to generator
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-neutral-500">
          {g.roleTitle || "role"}
          {g.company ? ` · ${g.company}` : ""} · {g.language}
        </span>
      </div>

      <article className="mx-auto max-w-3xl bg-white px-12 py-12 text-[13px] leading-relaxed text-neutral-900 shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none [&_a]:underline [&_h1]:mb-1 [&_h1]:mt-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-neutral-200 [&_h2]:pb-1 [&_h2]:text-[11px] [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-[0.12em] [&_h2]:text-neutral-500 [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-bold [&_li]:my-1 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        {sections.map((s, i) => (
          <section key={s.heading} className={i > 0 ? "mt-10 break-before-page" : ""}>
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }} />
          </section>
        ))}
      </article>

      <style>{`@page { margin: 16mm; }`}</style>
    </div>
  );
}
