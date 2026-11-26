import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Figures } from "@/components/admin/figures";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/page-header";
import { StatusWord } from "@/components/admin/status-word";
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
import { AUDIT_STATUSES, AUDIT_STATUS_TONES, auditReasonLabel, isAuditStatus } from "./audit-status";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Session guard + searchParams: this route is never prerendered.
export const dynamic = "force-dynamic";

const PATH = "/admin/audit";
const PAGE_SIZE = 25;
const COLS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const KEY_OPTIONS_LIMIT = 50;
const WIDE = "hidden md:table-cell";

type Params = Record<string, string | string[] | undefined>;

/** A day ago, apart from the components' bodies (`react-hooks/purity`). */
function since24h(): Date {
  return new Date(Date.now() - DAY_MS);
}

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * One line per call to `/api/mcp`, the denied ones too. Arguments and results
 * arrive here already redacted and cut (`lib/mcp/redact.ts`); no key in the
 * clear is ever recorded. A call has no page of its own: its details open in
 * place.
 */
export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params: Params = await searchParams;
  const q = one(params.q).slice(0, 120);
  const status = isAuditStatus(one(params.status)) ? one(params.status) : "";
  const keyId = one(params.key).slice(0, 40);
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);
  const [labels, keys] = await Promise.all([getAdminLabels(), listKeys()]);
  const { audit: words, vocab, common } = labels;

  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      <div className="space-y-8 font-text">
        <PageHeader
          title={words.title}
          description={words.description}
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/api-keys">
                <KeyRound aria-hidden="true" />
                {words.keys}
              </Link>
            </Button>
          }
        />

        {!dbConfigured && <StateMessage state="failed" message={common.states.noDatabase} />}

        <Suspense fallback={<StateMessage state="loading" message={common.states.loading} />}>
          <AuditFigures labels={labels} />
        </Suspense>

        <div className="space-y-4">
          <ListFilters
            values={{ q, status, key: keyId }}
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
                options: AUDIT_STATUSES.map((value) => ({ value, label: vocab.auditStatus[value] })),
              },
              {
                kind: "select",
                name: "key",
                label: words.filters.key,
                all: words.filters.allKeys,
                className: "sm:w-64",
                // "none": refusals before the key was identified (no header, an
                // unknown key). They are the lines that show probing.
                options: [
                  { value: "none", label: words.filters.noKey },
                  ...keys.map((key) => ({ value: key.id, label: `${key.name} (${key.keyPrefix}…)` })),
                ],
              },
            ]}
          />
          <Suspense
            key={`${q}|${status}|${keyId}|${page}`}
            fallback={
              <AuditTable labels={labels}>
                <TableStateRow cols={COLS} state="loading" message={words.states.loading} />
              </AuditTable>
            }
          >
            <AuditRows params={params} q={q} status={status} keyId={keyId} page={page} labels={labels} />
          </Suspense>
        </div>
      </div>
    </AdminShell>
  );
}

async function listKeys(): Promise<{ id: string; name: string; keyPrefix: string }[]> {
  if (!dbConfigured) return [];
  try {
    return await db.apiKey.findMany({
      select: { id: true, name: true, keyPrefix: true },
      orderBy: { createdAt: "desc" },
      take: KEY_OPTIONS_LIMIT,
    });
  } catch (err) {
    console.error("[admin] list audit keys failed", safeDbError(err));
    return [];
  }
}

/* ── the figures ──────────────────────────────────────────────────────────── */

async function AuditFigures({ labels }: { labels: AdminDictionary }) {
  const words = labels.audit.figures;
  const { formatNumber } = await getAdminFormat();
  const dayAgo = since24h();

  // A3: without DATABASE_URL every figure reads zero instead of throwing.
  let total = 0;
  let last24h = 0;
  let denied24h = 0;
  let errors24h = 0;
  let running = 0;
  if (dbConfigured) {
    try {
      [total, last24h, denied24h, errors24h, running] = await Promise.all([
        db.mcpAuditLog.count(),
        db.mcpAuditLog.count({ where: { createdAt: { gte: dayAgo } } }),
        db.mcpAuditLog.count({ where: { status: "denied", createdAt: { gte: dayAgo } } }),
        db.mcpAuditLog.count({ where: { status: "error", createdAt: { gte: dayAgo } } }),
        db.mcpAuditLog.count({ where: { status: "running" } }),
      ]);
    } catch (err) {
      console.error("[admin] audit stats failed", safeDbError(err));
    }
  }

  return (
    <Figures
      label={labels.figures.label}
      className="xl:grid-cols-5"
      items={[
        { label: words.calls, value: formatNumber(total) },
        { label: words.day, value: formatNumber(last24h) },
        { label: words.denied, value: formatNumber(denied24h), hint: words.deniedHint },
        { label: words.errors, value: formatNumber(errors24h) },
        { label: words.running, value: formatNumber(running), hint: words.runningHint },
      ]}
    />
  );
}

/* ── the table ────────────────────────────────────────────────────────────── */

async function AuditRows({
  params,
  q,
  status,
  keyId,
  page: asked,
  labels,
}: {
  params: Params;
  q: string;
  status: string;
  keyId: string;
  page: number;
  labels: AdminDictionary;
}) {
  const { audit: words, vocab, common } = labels;
  const { formatDateTime, formatNumber } = await getAdminFormat();
  const where: Prisma.McpAuditLogWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { tool: { contains: q, mode: "insensitive" as const } } : {}),
    ...(keyId === "none" ? { apiKeyId: null } : keyId ? { apiKeyId: keyId } : {}),
  };

  // A3: `next build` runs without DATABASE_URL: degrade, never throw.
  let rows: {
    id: string;
    tool: string;
    status: string;
    reason: string | null;
    latencyMs: number | null;
    ip: string | null;
    userAgent: string | null;
    keyPrefix: string | null;
    argsSummary: string | null;
    result: string | null;
    createdAt: Date;
    apiKey: { id: string; name: string } | null;
  }[] = [];
  let total = 0;
  let page = asked;
  let failed = !dbConfigured;
  if (dbConfigured) {
    try {
      // Counted first: a page past the end shows the last one.
      total = await db.mcpAuditLog.count({ where });
      page = Math.min(asked, Math.max(1, Math.ceil(total / PAGE_SIZE)));
      rows = await db.mcpAuditLog.findMany({
        where,
        select: {
          id: true,
          tool: true,
          status: true,
          reason: true,
          latencyMs: true,
          ip: true,
          userAgent: true,
          keyPrefix: true,
          argsSummary: true,
          result: true,
          createdAt: true,
          apiKey: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      });
    } catch (err) {
      console.error("[admin] list mcp audit failed", safeDbError(err));
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <AuditTable labels={labels}>
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
          q || status || keyId ? (
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
              <TableCell className="font-label text-xs">{formatDateTime(r.createdAt)}</TableCell>
              <TableCell>
                {/* Native <details>: the arguments open without a client
                    component per row. Already redacted and cut. */}
                <details className="group max-w-[56ch]">
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="font-label text-sm break-all">{r.tool}</span>
                    {(r.argsSummary || r.result) && (
                      <span className="mt-1 block text-sm text-foreground underline decoration-brand underline-offset-4 group-open:hidden">
                        {words.details}
                      </span>
                    )}
                  </summary>
                  <div className="mt-2 space-y-2 border-l-2 border-input pl-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{words.arguments}</p>
                      <pre className="font-label text-xs break-all whitespace-pre-wrap">{r.argsSummary || "—"}</pre>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{words.result}</p>
                      <pre className="font-label text-xs break-all whitespace-pre-wrap">{r.result || "—"}</pre>
                    </div>
                  </div>
                </details>
              </TableCell>
              <TableCell className={`${WIDE} max-w-0`}>
                {r.apiKey ? (
                  <Link
                    href={`${PATH}?key=${r.apiKey.id}`}
                    className="block truncate underline decoration-brand underline-offset-4"
                    title={fill(words.callsOf, { name: r.apiKey.name })}
                  >
                    {r.apiKey.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{words.unknownKey}</span>
                )}
                <span className="block font-label text-xs text-muted-foreground">{r.keyPrefix ? `${r.keyPrefix}…` : "—"}</span>
              </TableCell>
              <TableCell>
                <StatusWord tone={isAuditStatus(r.status) ? AUDIT_STATUS_TONES[r.status] : "bg-ink-3"}>
                  {isAuditStatus(r.status) ? vocab.auditStatus[r.status] : r.status}
                </StatusWord>
                {r.reason && <span className="mt-1 block text-sm text-muted-foreground">{auditReasonLabel(vocab.auditReason, r.reason)}</span>}
              </TableCell>
              <TableCell className={`${WIDE} text-right font-label text-sm text-muted-foreground`}>
                {r.latencyMs === null ? "—" : fill(words.ms, { ms: formatNumber(r.latencyMs) })}
              </TableCell>
              <TableCell className="hidden max-w-0 lg:table-cell">
                <span className="font-label text-xs">{r.ip ?? "—"}</span>
                {r.userAgent && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={r.userAgent}>
                    {r.userAgent}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </AuditTable>
      <ListFilters
        values={{ q, status, key: keyId }}
        page={page}
        totalPages={totalPages}
        total={failed ? undefined : total}
        position="bottom"
      />
    </>
  );
}

function AuditTable({ labels, children }: { labels: AdminDictionary; children: React.ReactNode }) {
  const { columns } = labels.audit;
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-28 md:w-40">{columns.when}</TableHead>
          <TableHead>{columns.tool}</TableHead>
          <TableHead className={`${WIDE} w-48`}>{columns.key}</TableHead>
          <TableHead className="w-32 md:w-48">{columns.status}</TableHead>
          <TableHead className={`${WIDE} w-24 text-right`}>{columns.latency}</TableHead>
          <TableHead className="hidden w-48 lg:table-cell">{columns.origin}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
