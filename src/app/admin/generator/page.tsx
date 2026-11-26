import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { GeneratorForm } from "@/components/admin/generator-form";
import { OpensRow, RowLink } from "@/components/admin/listing";
import { PageHeader } from "@/components/admin/page-header";
import { StateMessage, TableStateRow } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminDictionary } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { getAdminFormat, getAdminLabels } from "@/lib/admin/request";
import { clearedHref, currentHref } from "@/lib/admin/sort";
import { fill } from "@/lib/admin/text";
import { safeDbError } from "@/lib/safe-error";
import { GenerationsToolbar } from "./generations-toolbar";
import { languageLabel } from "./languages";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Session guard + searchParams: this route is never prerendered.
export const dynamic = "force-dynamic";

const PATH = "/admin/generator";
const PAGE_SIZE = 10;
const COLS = 5;
const WIDE = "hidden md:table-cell";
/** Columns that only fit from a laptop (1024 px) up. */
const LG = "hidden lg:table-cell";

type Params = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function GeneratorPage({ searchParams }: PageProps<"/admin/generator">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params: Params = await searchParams;
  const q = one(params.q).slice(0, 120);
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);
  const labels = await getAdminLabels();
  const { generator: words, vocab, common } = labels;

  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      <div className="space-y-8 font-text">
        <PageHeader title={words.title} description={words.description} />

        {!dbConfigured && <StateMessage state="failed" message={common.noDatabase} />}

        <GeneratorForm words={{ generator: words, languages: vocab.generatorLanguage }} />

        <section aria-labelledby="generations" className="space-y-4">
          <div className="space-y-1">
            <h2 id="generations" className="font-title text-2xl font-[560] [font-stretch:108%]">
              {words.recent.title}
            </h2>
            <p className="text-sm text-muted-foreground">{words.recent.help}</p>
          </div>
          <GenerationsToolbar
            q={q}
            page={page}
            words={{ filters: words.recent.filters, clear: common.states.clear }}
            position="top"
          />
          <Suspense
            key={`${q}|${page}`}
            fallback={
              <GenerationsTable labels={labels}>
                <TableStateRow cols={COLS} state="loading" message={words.recent.states.loading} />
              </GenerationsTable>
            }
          >
            <GenerationsRows params={params} q={q} page={page} labels={labels} />
          </Suspense>
        </section>
      </div>
    </AdminShell>
  );
}

async function GenerationsRows({
  params,
  q,
  page: asked,
  labels,
}: {
  params: Params;
  q: string;
  page: number;
  labels: AdminDictionary;
}) {
  const { generator: words, vocab, common } = labels;
  const { formatDateTime } = await getAdminFormat();
  const where = q
    ? {
        OR: [
          { roleTitle: { contains: q, mode: "insensitive" as const } },
          { company: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  // A3: `next build` runs without DATABASE_URL: degrade, never throw.
  let rows: { id: string; company: string | null; roleTitle: string | null; language: string; createdAt: Date }[] = [];
  let total = 0;
  let page = asked;
  let failed = !dbConfigured;
  if (dbConfigured) {
    try {
      // Counted first: a page past the end shows the last one.
      total = await db.generation.count({ where });
      page = Math.min(asked, Math.max(1, Math.ceil(total / PAGE_SIZE)));
      rows = await db.generation.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: { id: true, company: true, roleTitle: true, language: true, createdAt: true },
      });
    } catch (err) {
      console.error("[admin] list generations failed", safeDbError(err));
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <GenerationsTable labels={labels}>
        {failed ? (
          dbConfigured ? (
            <TableStateRow
              cols={COLS}
              state="failed"
              message={words.recent.states.failed}
              action={{ href: currentHref(PATH, params), label: common.retry }}
            />
          ) : (
            <TableStateRow cols={COLS} state="failed" message={common.states.noDatabase} />
          )
        ) : rows.length === 0 ? (
          q ? (
            <TableStateRow
              cols={COLS}
              state="filtered"
              message={words.recent.states.filtered}
              action={{ href: clearedHref(PATH), label: common.states.clear }}
            />
          ) : (
            <TableStateRow cols={COLS} state="empty" message={words.recent.states.empty} />
          )
        ) : (
          rows.map((g) => {
            const name = [g.roleTitle || words.recent.untitled, g.company].filter(Boolean).join(" · ");
            const href = `${PATH}/${g.id}`;
            return (
              <OpensRow key={g.id} href={href}>
                <TableCell className="max-w-0">
                  <RowLink href={href} title={g.roleTitle ?? undefined} className="block truncate">
                    {g.roleTitle || words.recent.untitled}
                  </RowLink>
                  <div className="truncate text-sm text-muted-foreground md:hidden">{g.company || "—"}</div>
                </TableCell>
                <TableCell className={`${WIDE} max-w-0 truncate`} title={g.company ?? undefined}>
                  {g.company || "—"}
                </TableCell>
                <TableCell className={LG}>{languageLabel(vocab.generatorLanguage, g.language)}</TableCell>
                <TableCell className={`${LG} font-label text-xs whitespace-nowrap`}>{formatDateTime(g.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link href={href} aria-label={fill(words.recent.open, { name })} title={fill(words.recent.open, { name })}>
                      <FileText aria-hidden="true" />
                    </Link>
                  </Button>
                </TableCell>
              </OpensRow>
            );
          })
        )}
      </GenerationsTable>
      <GenerationsToolbar q={q} page={page} totalPages={totalPages} total={failed ? undefined : total} position="bottom" />
    </>
  );
}

function GenerationsTable({ labels, children }: { labels: AdminDictionary; children: React.ReactNode }) {
  const { columns } = labels.generator.recent;
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead>{columns.role}</TableHead>
          <TableHead className={WIDE}>{columns.company}</TableHead>
          <TableHead className={`${LG} w-32`}>{columns.language}</TableHead>
          <TableHead className={`${LG} w-44`}>{columns.created}</TableHead>
          <TableHead className="w-24 text-right">{columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
