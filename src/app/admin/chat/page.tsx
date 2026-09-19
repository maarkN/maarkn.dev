import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Coins, Gauge, MessageSquare, Sun, Users, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { CHAT_LIMITS } from "@/lib/chat-log";
import { formatDateTime, formatNumber } from "@/lib/format";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  ListingIndexCell,
  ListingIndexHead,
  TableEmptyRow,
  TableLoadingRow,
} from "@/components/admin/table-pager";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "../_components/stat-card";
import { CHAT_STATUS_STYLES } from "./chat-status";
import { ChatToolbar } from "./chat-toolbar";

export const metadata: Metadata = {
  title: "Chat · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

/** Guard + searchParams: never prerender this route. */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
// A coluna de índice conta: `colSpan` que mentir deixa a linha vazia curta.
const COLS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const STAT_TILES = 6;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Start of the current UTC day — the same boundary `lib/chat-log.ts` uses for
 * the global daily budget, so the tile and the limiter never disagree.
 *
 * Module scope on purpose: `Date.now()` inside a component body is flagged by
 * `react-hooks/purity`.
 */
function startOfUtcDay(): Date {
  return new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS);
}

export default async function AdminChatPage({
  searchParams,
}: PageProps<"/admin/chat">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const sp = await searchParams; // Next 16: searchParams is a Promise
  const q = one(sp.q);
  const status = one(sp.status);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          title="Chat"
          description={`Cada turno de visitante que chega ao modelo, com estimativa de tokens. Limites: ${CHAT_LIMITS.perIpMax} msgs por visitante a cada ${Math.round(
            CHAT_LIMITS.perIpWindowMs / 60000,
          )} min · ${CHAT_LIMITS.dailyMax}/dia no total.`}
        />

        {!dbConfigured ? (
          <Card size="sm">
            <CardContent className="text-destructive">
              DATABASE_URL não está definida — os logs do chat ficam
              indisponíveis.
            </CardContent>
          </Card>
        ) : null}

        <Suspense fallback={<StatsSkeleton />}>
          <ChatStats />
        </Suspense>

        <Suspense
          key={`${q}|${status}|${page}`}
          fallback={<ChatTableSkeleton />}
        >
          <ChatLogsTable q={q} status={status} page={page} />
        </Suspense>
      </div>
    </AdminShell>
  );
}

/* ── KPI tiles ────────────────────────────────────────────────────────────── */

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: STAT_TILES }, (_, i) => (
        <Card key={`stat-skeleton-${i}`} size="sm">
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function ChatStats() {
  const dayStart = startOfUtcDay();

  // A3: without DATABASE_URL every tile reads zero instead of throwing.
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
        db.chatLog.aggregate({
          _sum: { promptTokens: true, answerTokens: true },
        }),
        db.chatLog.aggregate({
          where: { createdAt: { gte: dayStart } },
          _sum: { promptTokens: true, answerTokens: true },
        }),
      ]);
      total = t;
      todayCount = today;
      visitors = uniq;
      totalTokens =
        (totals._sum.promptTokens ?? 0) + (totals._sum.answerTokens ?? 0);
      todayTokens =
        (todayTotals._sum.promptTokens ?? 0) +
        (todayTotals._sum.answerTokens ?? 0);
    } catch (err) {
      console.error("[admin] chat stats failed", err);
    }
  }

  const dailyPct = Math.min(
    100,
    Math.round((todayCount / CHAT_LIMITS.dailyMax) * 100),
  );

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Mensagens"
        value={formatNumber(total)}
        icon={MessageSquare}
      />
      <StatCard label="Hoje" value={formatNumber(todayCount)} icon={Sun} />
      <StatCard label="Visitantes" value={formatNumber(visitors)} icon={Users} />
      <StatCard
        label="Tokens (est.)"
        value={formatNumber(totalTokens)}
        icon={Coins}
      />
      <StatCard
        label="Tokens hoje"
        value={formatNumber(todayTokens)}
        icon={Zap}
      />
      <StatCard
        label="Orçamento diário"
        value={`${dailyPct}%`}
        hint={`${formatNumber(todayCount)} / ${formatNumber(CHAT_LIMITS.dailyMax)}`}
        bar={dailyPct}
        icon={Gauge}
      />
    </div>
  );
}

/* ── table ────────────────────────────────────────────────────────────────── */

function ChatTableHead() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <ListingIndexHead />
        <TableHead className="w-[20ch]">quando</TableHead>
        <TableHead>conversa</TableHead>
        <TableHead className="hidden w-[12ch] md:table-cell">visitante</TableHead>
        <TableHead className="hidden w-[12ch] sm:table-cell">status</TableHead>
        <TableHead className="w-[12ch] text-right">tokens</TableHead>
        <TableHead className="hidden w-[12ch] lg:table-cell text-right">
          latencia
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

/** State 1 of §3: loading. */
function ChatTableSkeleton() {
  return (
    <Table className="table-fixed">
      <ChatTableHead />
      <TableBody>
        <TableLoadingRow cols={COLS} />
      </TableBody>
    </Table>
  );
}

async function ChatLogsTable({
  q,
  status,
  page,
}: {
  q: string;
  status: string;
  page: number;
}) {
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { question: { contains: q, mode: "insensitive" as const } } : {}),
  };

  // A3: `next build` runs without DATABASE_URL — degrade, never throw.
  let rows: Awaited<ReturnType<typeof db.chatLog.findMany>> = [];
  let total = 0;
  let failed = false;
  if (dbConfigured) {
    try {
      [rows, total] = await Promise.all([
        db.chatLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        db.chatLog.count({ where }),
      ]);
    } catch (err) {
      console.error("[admin] list chat logs failed", err);
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-3">
      <ChatToolbar
          q={q}
          status={status}
          page={page}
          totalPages={totalPages}
          total={total}
          position="top"
        />

        <Table className="table-fixed">
          <ChatTableHead />
          <TableBody>
            {failed || !dbConfigured ? (
              <TableEmptyRow
                cols={COLS}
                destructive
                message={
                  dbConfigured
                    ? "Não foi possível carregar os logs do chat."
                    : "Banco indisponível: DATABASE_URL não está configurada."
                }
              />
            ) : rows.length === 0 ? (
              <TableEmptyRow cols={COLS} message="Nenhuma conversa encontrada." />
            ) : (
              rows.map((r, index) => (
                <TableRow key={r.id} className="align-top">
                  <ListingIndexCell index={index} />
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                    <span className="mt-1 block text-xs uppercase">
                      {r.locale}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {/* Native <details>: the answer expands without shipping a
                        client component per row. */}
                    <details className="group max-w-[560px]">
                      <summary className="cursor-pointer list-none font-medium marker:hidden">
                        <span className="line-clamp-2 group-open:line-clamp-none">
                          {r.question || "—"}
                        </span>
                        <span className="mt-1 inline-block text-xs text-brand group-open:hidden">
                          ver resposta ↓
                        </span>
                      </summary>
                      <div className="mt-3 border-l-2 border-brand/40 pl-3 leading-relaxed text-muted-foreground">
                        <p className="whitespace-pre-wrap">
                          {r.answer || (
                            <span className="italic">
                              (nenhuma resposta capturada)
                            </span>
                          )}
                        </p>
                        <p className="mt-2 text-xs">
                          {r.model || "—"}
                        </p>
                      </div>
                    </details>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {r.clientKeyHash.slice(0, 8)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <StatusBadge status={r.status} styles={CHAT_STATUS_STYLES} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(r.promptTokens + r.answerTokens)}
                    <span className="block text-xs text-muted-foreground">
                      {formatNumber(r.promptTokens)}+
                      {formatNumber(r.answerTokens)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums text-muted-foreground">
                    {r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <ChatToolbar
          q={q}
          status={status}
          page={page}
          totalPages={totalPages}
          total={total}
        position="bottom"
      />
    </div>
  );
}
