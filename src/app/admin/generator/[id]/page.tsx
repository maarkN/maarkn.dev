import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { languageLabel } from "../languages";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Geração · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * SEGURANÇA (F7/injeção): `"` e `'` TAMBÉM são escapados. O corpo desta página
 * é saída de LLM derivada de uma descrição de vaga colada — texto de terceiro,
 * portanto não confiável. Sem escapar as aspas, um anúncio contendo
 * `[x](" autofocus onfocus=alert`1` a=")` sairia daqui como
 * `<a href="" autofocus onfocus=alert`1` a="">` dentro de um
 * `dangerouslySetInnerHTML` — XSS armazenado na origem do admin.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Allowlist de esquema para o `href` de um link markdown. `javascript:`,
 * `data:` e `vbscript:` executam script no clique; qualquer coisa fora de
 * http/https/mailto/âncora vira `#`.
 */
function safeHref(raw: string): string {
  const url = raw.trim();
  if (/^(https?:\/\/|mailto:|#|\/)/i.test(url)) return url;
  return "#";
}

function inline(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, href: string) => {
      // `href` já vem escapado por `escapeHtml`; `&quot;` impede fechar o
      // atributo, e `safeHref` recusa esquemas executáveis.
      return `<a href="${safeHref(href)}" rel="noreferrer nofollow">${text}</a>`;
    })
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

/**
 * Print view — deliberately outside `AdminShell`: it is the sheet of paper that
 * becomes the PDF. The light palette below is hardcoded on purpose (the admin
 * chrome is always dark, and a dark CV prints as a black rectangle). Only the
 * solid button variants are used here, since `ghost`/`outline` would inherit
 * the dark theme's foreground onto a light background.
 */
export default async function GenerationDetail({
  params,
}: PageProps<"/admin/generator/[id]">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const { id } = await params;
  if (!dbConfigured) notFound(); // A3

  const g = await db.generation.findUnique({ where: { id } });
  if (!g) notFound();

  const sections = [
    { key: "resume", body: g.resume },
    { key: "coverLetter", body: g.coverLetter },
    { key: "screeningAnswers", body: g.screeningAnswers },
  ].filter((s) => s.body && s.body.trim());

  return (
    <div className="min-h-dvh bg-neutral-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/generator">
              <ArrowLeft className="size-4" />
              Voltar ao gerador
            </Link>
          </Button>
          <PrintButton />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
          <span>
            {g.roleTitle || "Vaga sem título"}
            {g.company ? ` · ${g.company}` : ""}
          </span>
          <Badge variant="secondary">{languageLabel(g.language)}</Badge>
        </div>
      </div>

      <article className="mx-auto max-w-3xl bg-white px-12 py-12 text-[13px] leading-relaxed text-neutral-900 shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none [&_a]:underline [&_h1]:mb-1 [&_h1]:mt-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-neutral-200 [&_h2]:pb-1 [&_h2]:text-[11px] [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-[0.12em] [&_h2]:text-neutral-500 [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-bold [&_li]:my-1 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        {sections.length === 0 ? (
          <p className="text-neutral-500">Esta geração está vazia.</p>
        ) : (
          sections.map((s, i) => (
            <section key={s.key} className={i > 0 ? "mt-10 break-before-page" : ""}>
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }} />
            </section>
          ))
        )}
      </article>

      <style>{`@page { margin: 16mm; }`}</style>
    </div>
  );
}
