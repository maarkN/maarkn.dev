import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollText, ShieldAlert } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/page-header";
import { StatusWord } from "@/components/admin/status-word";
import { StateMessage, TableStateRow } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminDictionary } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
// Everything here is a real instant (creation, last use, expiry, revocation):
// `formatDateTime` by A5; `formatDate` is for calendar dates, in UTC.
import { getAdminFormat, getAdminLabels } from "@/lib/admin/request";
import { clearedHref, currentHref } from "@/lib/admin/sort";
import { fill } from "@/lib/admin/text";
import { isKeyGenerationConfigured } from "@/lib/mcp/auth";
import { MCP_WRITE_SCOPES } from "@/lib/mcp/scopes";
import { safeDbError } from "@/lib/safe-error";
import { CreateKeyDialog } from "./create-key-dialog";
import { KEY_STATUSES, KEY_STATUS_TONES, isKeyStatus, keyStatusOf } from "./key-status";
import { RevokeKeyDialog } from "./revoke-key-dialog";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Session guard + searchParams: this route is never prerendered.
export const dynamic = "force-dynamic";

const PATH = "/admin/api-keys";
const PAGE_SIZE = 20;
const COLS = 7;
/** Columns that only fit from a laptop (1024 px) and from a desktop (1280 px) up. */
const LG = "hidden lg:table-cell";
const XL = "hidden xl:table-cell";

type Params = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** "Now", apart from the components' bodies (`react-hooks/purity`). */
function nowMs(): number {
  return Date.now();
}

/**
 * The credentials of the MCP server. The key in the clear shows once, when it
 * is created (`CreateKeyDialog`); the database keeps only an HMAC. A key has
 * no page of its own: its calls are on the audit, one click away.
 */
export default async function ApiKeysPage({ searchParams }: PageProps<"/admin/api-keys">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params: Params = await searchParams;
  const q = one(params.q).slice(0, 120);
  const status = isKeyStatus(one(params.status)) ? one(params.status) : "";
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);
  const pepperOk = isKeyGenerationConfigured();
  const labels = await getAdminLabels();
  const { apiKeys: words, vocab, common } = labels;

  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      <div className="space-y-6 font-text">
        <PageHeader
          title={words.title}
          description={words.description}
          actions={
            <>
              <Button asChild variant="outline">
                <Link href="/admin/audit">
                  <ScrollText aria-hidden="true" />
                  {words.audit}
                </Link>
              </Button>
              <CreateKeyDialog
                disabled={!dbConfigured || !pepperOk}
                words={{ create: words.create, vocab: { scope: vocab.scope, expiry: vocab.expiry }, never: words.never, write: words.write }}
              />
            </>
          }
        />

        {!dbConfigured && <StateMessage state="failed" message={common.states.noDatabase} />}
        {dbConfigured && !pepperOk && (
          <p className="flex max-w-[72ch] items-start gap-2 text-foreground">
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
            {words.noPepper}
          </p>
        )}

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
                options: KEY_STATUSES.map((value) => ({ value, label: vocab.keyStatus[value] })),
              },
            ]}
          />
          <Suspense
            key={`${q}|${status}|${page}`}
            fallback={
              <KeysTable labels={labels}>
                <TableStateRow cols={COLS} state="loading" message={words.states.loading} />
              </KeysTable>
            }
          >
            <KeysRows params={params} q={q} status={status} page={page} labels={labels} />
          </Suspense>
        </div>
      </div>
    </AdminShell>
  );
}

function statusWhere(status: string, at: Date): Prisma.ApiKeyWhereInput {
  if (status === "revoked") return { revokedAt: { not: null } };
  if (status === "expired") return { revokedAt: null, expiresAt: { lte: at } };
  if (status === "active") return { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: at } }] };
  return {};
}

async function KeysRows({
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
  const { apiKeys: words, vocab, common } = labels;
  const { formatDateTime } = await getAdminFormat();
  const at = new Date(nowMs());
  // An explicit `AND`: the search and the status each use an `OR`, and two at
  // the same level would overwrite each other.
  const where: Prisma.ApiKeyWhereInput = {
    AND: [
      statusWhere(status, at),
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { keyPrefix: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
    ],
  };

  // A3: `next build` runs without DATABASE_URL: degrade, never throw.
  let rows: {
    id: string;
    name: string;
    keyPrefix: string;
    scopes: string[];
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
  }[] = [];
  let total = 0;
  let page = asked;
  let failed = !dbConfigured;
  if (dbConfigured) {
    try {
      // Counted first: a page past the end shows the last one.
      total = await db.apiKey.count({ where });
      page = Math.min(asked, Math.max(1, Math.ceil(total / PAGE_SIZE)));
      rows = await db.apiKey.findMany({
        where,
        // `keyHash` NEVER leaves the database: not to the HTML, the RSC payload
        // or a log. The select is explicit for that.
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
        },
        orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      });
    } catch (err) {
      console.error("[admin] list api keys failed", safeDbError(err));
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <KeysTable labels={labels}>
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
          rows.map((r) => {
            const st = keyStatusOf(r, at.getTime());
            return (
              <TableRow key={r.id} className="align-top">
                <TableCell className="max-w-0">
                  <div className="truncate font-semibold" title={r.name}>
                    {r.name}
                  </div>
                  <span className="block font-label text-xs text-muted-foreground">
                    {fill(words.createdOn, { date: formatDateTime(r.createdAt) })}
                  </span>
                </TableCell>
                <TableCell className={`${LG} font-label text-sm whitespace-nowrap`}>{r.keyPrefix}…</TableCell>
                <TableCell className="hidden xl:table-cell">
                  {r.scopes.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <ul className="flex flex-wrap gap-x-3 gap-y-1 font-label text-xs">
                      {r.scopes.map((scope) => {
                        const write = (MCP_WRITE_SCOPES as readonly string[]).includes(scope);
                        return (
                          <li key={scope} title={write ? words.writeHint : words.readHint}>
                            {scope}
                            {write && <span className="font-text text-muted-foreground"> · {words.write}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TableCell>
                <TableCell className={`${XL} font-label text-xs`}>
                  {r.lastUsedAt ? formatDateTime(r.lastUsedAt) : words.never}
                </TableCell>
                <TableCell className={`${LG} font-label text-xs`}>
                  {r.expiresAt ? formatDateTime(r.expiresAt) : words.noExpiry}
                </TableCell>
                <TableCell>
                  <StatusWord tone={KEY_STATUS_TONES[st]}>{vocab.keyStatus[st]}</StatusWord>
                  {r.revokedAt && (
                    <span className="mt-1 block font-label text-xs text-muted-foreground">{formatDateTime(r.revokedAt)}</span>
                  )}
                </TableCell>
                {/* Icon buttons, named: two words in a fixed column were cut at
                    390 px, and the cell never clips what is inside it. */}
                <TableCell className="text-right">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link
                        href={`/admin/audit?key=${r.id}`}
                        aria-label={fill(words.calls, { name: r.name })}
                        title={fill(words.calls, { name: r.name })}
                      >
                        <ScrollText aria-hidden="true" />
                      </Link>
                    </Button>
                    {st !== "revoked" && <RevokeKeyDialog id={r.id} name={r.name} keyPrefix={r.keyPrefix} words={words.revoke} />}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </KeysTable>
      <ListFilters values={{ q, status }} page={page} totalPages={totalPages} total={failed ? undefined : total} position="bottom" />
    </>
  );
}

function KeysTable({ labels, children }: { labels: AdminDictionary; children: React.ReactNode }) {
  const { columns } = labels.apiKeys;
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead>{columns.name}</TableHead>
          <TableHead className={`${LG} w-32`}>{columns.prefix}</TableHead>
          <TableHead className="hidden w-52 xl:table-cell">{columns.scopes}</TableHead>
          <TableHead className={`${XL} w-32`}>{columns.lastUsed}</TableHead>
          <TableHead className={`${LG} w-32`}>{columns.expires}</TableHead>
          <TableHead className="w-32">{columns.status}</TableHead>
          <TableHead className="w-28 text-right">{columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
