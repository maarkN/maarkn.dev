import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Figures } from "@/components/admin/figures";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/page-header";
import { StatusWord } from "@/components/admin/status-word";
import { StateMessage, TableStateRow } from "@/components/admin/table-pager";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminDictionary } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { CHAT_LIMITS } from "@/lib/chat-log";
import { db, dbConfigured } from "@/lib/db";
import { getAdminFormat, getAdminLabels } from "@/lib/admin/request";
import { clearedHref, currentHref } from "@/lib/admin/sort";
import { fill } from "@/lib/admin/text";
import { safeDbError } from "@/lib/safe-error";
import { CHAT_STATUSES, CHAT_STATUS_TONES, isChatStatus } from "./chat-status";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Session guard + searchParams: this route is never prerendered.
export const dynamic = "force-dynamic";

const PATH = "/admin/chat";
const PAGE_SIZE = 25;
const COLS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const WIDE = "hidden md:table-cell";

type Params = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function startOfUtcDay(): Date {
  return new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS);
}

/**
 * The assistant of the site, seen from behind: every visitor question that
 * reached the model, its answer, and what it cost. A question has no page of
 * its own: its answer opens in place.
 */
export default async function AdminChatPage({ searchParams }: PageProps<"/admin/chat">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params: Params = await searchParams;
  const q = one(params.q).slice(0, 120);
  const status = isChatStatus(one(params.status)) ? one(params.status) : "";
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);
  const labels = await getAdminLabels();
  const { chat: words, vocab, common } = labels;

  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      <div className="space-y-8 font-text">
        <PageHeader
          title={words.title}
          description={fill(words.description, {
            perIp: CHAT_LIMITS.perIpMax,
            minutes: Math.round(CHAT_LIMITS.perIpWindowMs / 60000),
            daily: CHAT_LIMITS.dailyMax,
          })}
        />

        {!dbConfigured && <StateMessage state="failed" message={common.states.noDatabase} />}

        <Suspense fallback={<StateMessage state="loading" message={common.states.loading} />}>
          <ChatFigures labels={labels} />
        </Suspense>

        <div className="space-y-4">
          <ListFilters
            values={{ q, status }}
            page={page}
            position="top"
            words={{ label: words.filters.label, apply: words.filters.apply, clear: common.states.clear }}
            fields={[
              { kind: "search", name: "q", label: words.filters.search, placeholder: words.filters.searchPlaceholder },
              {
                kind: "select",
                name: "status",
                label: words.filters.status,
                all: words.filters.allStatuses,
                options: CHAT_STATUSES.map((value) => ({ value, label: vocab.chatStatus[value] })),
              },
            ]}
          />
          <Suspense
            key={`${q}|${status}|${page}`}
            fallback={
              <ChatTable labels={labels}>
                <TableStateRow cols={COLS} state="loading" message={words.states.loading} />
              </ChatTable>
            }
          >
            <ChatRows params={params} q={q} status={status} page={page} labels={labels} />
          </Suspense>
        </div>
      </div>
    </AdminShell>
  );
}

/* ── the figures ──────────────────────────────────────────────────────────── */

async function ChatFigures({ labels }: { labels: AdminDictionary }) {
  const words = labels.chat.figures;
  const { formatNumber } = await getAdminFormat();
  const dayStart = startOfUtcDay();

  // A3: without DATABASE_URL every figure reads zero instead of throwing.
  let total = 0;
  let todayCount = 0;
  let visitors = 0;
  let totalTokens = 0;
  let todayTokens = 0;
  if (dbConfigured) {
    try {
      const [t, today, uniq, totals, todayTotals] = await Promise.all([
        db.chatLog.count(),
        db.chatLog.count({ where: { createdAt: { gte: dayStart } } }),
        db.chatLog.groupBy({ by: ["clientKeyHash"] }).then((g) => g.length),
        db.chatLog.aggregate({ _sum: { promptTokens: true, answerTokens: true } }),
        db.chatLog.aggregate({ where: { createdAt: { gte: dayStart } }, _sum: { promptTokens: true, answerTokens: true } }),
      ]);
      total = t;
      todayCount = today;
      visitors = uniq;
      totalTokens = (totals._sum.promptTokens ?? 0) + (totals._sum.answerTokens ?? 0);
      todayTokens = (todayTotals._sum.promptTokens ?? 0) + (todayTotals._sum.answerTokens ?? 0);
    } catch (err) {
      console.error("[admin] chat stats failed", safeDbError(err));
    }
  }
  const dailyPct = Math.min(100, Math.round((todayCount / CHAT_LIMITS.dailyMax) * 100));

  return (
    <Figures
      label={labels.figures.label}
      items={[
        { label: words.messages, value: formatNumber(total) },
        { label: words.today, value: formatNumber(todayCount) },
        { label: words.visitors, value: formatNumber(visitors) },
        { label: words.tokens, value: formatNumber(totalTokens) },
        { label: words.tokensToday, value: formatNumber(todayTokens) },
        {
          label: words.budget,
          value: `${formatNumber(dailyPct)}%`,
          hint: fill(words.budgetHint, { used: formatNumber(todayCount), max: formatNumber(CHAT_LIMITS.dailyMax) }),
          share: dailyPct,
        },
      ]}
    />
  );
}

/* ── the table ────────────────────────────────────────────────────────────── */

async function ChatRows({
  params,
  q,
  status,
  page: asked,
  labels,
}: {
  params: Params;
  q: string;
  status: string;
  page: number;
  labels: AdminDictionary;
}) {
  const { chat: words, vocab, common } = labels;
  const { formatDateTime, formatNumber } = await getAdminFormat();
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { question: { contains: q, mode: "insensitive" as const } } : {}),
  };

  // A3: `next build` runs without DATABASE_URL: degrade, never throw.
  let rows: Awaited<ReturnType<typeof db.chatLog.findMany>> = [];
  let total = 0;
  let page = asked;
  let failed = !dbConfigured;
  if (dbConfigured) {
    try {
      // Counted first: a page past the end shows the last one.
      total = await db.chatLog.count({ where });
      page = Math.min(asked, Math.max(1, Math.ceil(total / PAGE_SIZE)));
      rows = await db.chatLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      });
    } catch (err) {
      console.error("[admin] list chat logs failed", safeDbError(err));
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <ChatTable labels={labels}>
        {failed ? (
          dbConfigured ? (
            <TableStateRow
              cols={COLS}
              state="failed"
              message={words.states.failed}
              action={{ href: currentHref(PATH, params), label: common.retry }}
            />
          ) : (
            <TableStateRow cols={COLS} state="failed" message={common.states.noDatabase} />
          )
        ) : rows.length === 0 ? (
          q || status ? (
            <TableStateRow
              cols={COLS}
              state="filtered"
              message={words.states.filtered}
              action={{ href: clearedHref(PATH), label: common.states.clear }}
            />
          ) : (
            <TableStateRow cols={COLS} state="empty" message={words.states.empty} />
          )
        ) : (
          rows.map((r) => (
            <TableRow key={r.id} className="align-top">
              <TableCell className="font-label text-xs">
                {formatDateTime(r.createdAt)}
                <span className="mt-1 block text-muted-foreground">{r.locale}</span>
              </TableCell>
              <TableCell>
                {/* Native <details>: the answer opens without a client component per row. */}
                <details className="group max-w-[64ch]">
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    {/* The visitor's words: not translated, in the language they wrote. */}
                    <span lang={r.locale} className="line-clamp-2 font-medium group-open:line-clamp-none">
                      {r.question || "—"}
                    </span>
                    <span className="mt-1 inline-block text-sm text-foreground underline decoration-brand underline-offset-4 group-open:hidden">
                      {words.showAnswer}
                    </span>
                  </summary>
                  <div className="mt-3 space-y-2 border-l-2 border-input pl-3">
                    <p lang={r.locale} className="whitespace-pre-wrap text-muted-foreground">
                      {r.answer || words.noAnswer}
                    </p>
                    <p className="font-label text-xs text-muted-foreground">{fill(words.model, { model: r.model || "—" })}</p>
                  </div>
                </details>
              </TableCell>
              <TableCell className={`${WIDE} font-label text-xs text-muted-foreground`}>{r.clientKeyHash.slice(0, 8)}</TableCell>
              <TableCell className={WIDE}>
                <StatusWord tone={isChatStatus(r.status) ? CHAT_STATUS_TONES[r.status] : "bg-ink-3"}>
                  {isChatStatus(r.status) ? vocab.chatStatus[r.status] : r.status}
                </StatusWord>
              </TableCell>
              <TableCell className="text-right font-label text-sm">
                {formatNumber(r.promptTokens + r.answerTokens)}
                <span className="block text-xs text-muted-foreground">
                  {fill(words.split, { prompt: formatNumber(r.promptTokens), answer: formatNumber(r.answerTokens) })}
                </span>
              </TableCell>
              <TableCell className={`${WIDE} text-right font-label text-sm text-muted-foreground`}>
                {r.latencyMs ? `${formatNumber(Math.round(r.latencyMs / 100) / 10)} s` : "—"}
              </TableCell>
            </TableRow>
          ))
        )}
      </ChatTable>
      <ListFilters values={{ q, status }} page={page} totalPages={totalPages} total={failed ? undefined : total} position="bottom" />
    </>
  );
}

function ChatTable({ labels, children }: { labels: AdminDictionary; children: React.ReactNode }) {
  const { columns } = labels.chat;
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-28 md:w-40">{columns.when}</TableHead>
          <TableHead>{columns.question}</TableHead>
          <TableHead className={`${WIDE} w-28`}>{columns.visitor}</TableHead>
          <TableHead className={`${WIDE} w-36`}>{columns.status}</TableHead>
          <TableHead className="w-28 text-right md:w-44">{columns.tokens}</TableHead>
          <TableHead className={`${WIDE} w-24 text-right`}>{columns.latency}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
