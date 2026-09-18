import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, KeyRound, ShieldX, Sun } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  TableEmptyRow,
  TableSkeletonRows,
} from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
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
import {
  AUDIT_STATUS_STYLES,
  auditReasonLabel,
  isAuditStatus,
} from "./audit-status";
import { AuditToolbar, type KeyOption } from "./audit-toolbar";

export const metadata: Metadata = {
  title: "Auditoria do MCP · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

/** Guard + searchParams: nunca prerenderize esta rota. */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const COLS = 6;
const STAT_TILES = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Teto do select de chaves da toolbar — é filtro, não listagem. */
const KEY_OPTIONS_LIMIT = 50;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Fora do corpo do componente: `Date.now()` ali é sinalizado por `react-hooks/purity`. */
function since24h(): Date {
  return new Date(Date.now() - DAY_MS);
}

export default async function AuditPage({
  searchParams,
}: PageProps<"/admin/audit">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const sp = await searchParams; // Next 16: searchParams é Promise
  const q = one(sp.q);
  const statusRaw = one(sp.status);
  const status = isAuditStatus(statusRaw) ? statusRaw : "";
  const keyId = one(sp.key);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          title="Auditoria do MCP"
          description="Uma linha por chamada a /api/mcp — inclusive as recusadas. Argumentos e resultados já chegam aqui redigidos e truncados; nenhuma chave em claro é gravada."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/api-keys">
                <KeyRound className="size-4" />
                Chaves de API
              </Link>
            </Button>
          }
        />

        {!dbConfigured ? (
          <Card size="sm">
            <CardContent className="text-destructive">
              DATABASE_URL não está definida — a auditoria fica indisponível.
            </CardContent>
          </Card>
        ) : null}

        <Suspense fallback={<StatsSkeleton />}>
          <AuditStats />
        </Suspense>

        <Suspense
          key={`${q}|${status}|${keyId}|${page}`}
          fallback={<AuditTableSkeleton />}
        >
          <AuditTable q={q} status={status} keyId={keyId} page={page} />
        </Suspense>
      </div>
    </AdminShell>
  );
}

/* ── KPIs ─────────────────────────────────────────────────────────────────── */

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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

async function AuditStats() {
  const dayAgo = since24h();

  // A3: sem DATABASE_URL cada tile lê zero em vez de lançar.
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
        db.mcpAuditLog.count({
          where: { status: "denied", createdAt: { gte: dayAgo } },
        }),
        db.mcpAuditLog.count({
          where: { status: "error", createdAt: { gte: dayAgo } },
        }),
        db.mcpAuditLog.count({ where: { status: "running" } }),
      ]);
    } catch (err) {
      console.error("[admin] audit stats failed", err);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard label="Chamadas" value={formatNumber(total)} icon={Activity} />
      <StatCard label="Últimas 24h" value={formatNumber(last24h)} icon={Sun} />
      <StatCard
        label="Recusadas (24h)"
        value={formatNumber(denied24h)}
        hint="varredura, escopo ou rate limit"
        icon={ShieldX}
      />
      <StatCard
        label="Erros (24h)"
        value={formatNumber(errors24h)}
        icon={AlertTriangle}
      />
      <StatCard
        label="Em curso"
        value={formatNumber(running)}
        hint="não fechadas: travaram ou derrubaram o processo"
        icon={Activity}
      />
    </div>
  );
}

/* ── tabela ───────────────────────────────────────────────────────────────── */

function AuditTableHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Quando</TableHead>
        <TableHead>Tool</TableHead>
        <TableHead className="hidden md:table-cell">Chave</TableHead>
        <TableHead>Situação</TableHead>
        <TableHead className="text-right">Latência</TableHead>
        <TableHead className="hidden lg:table-cell">Origem</TableHead>
      </TableRow>
    </TableHeader>
  );
}

/** Estado 1 do §3: carregando. */
function AuditTableSkeleton() {
  return (
    <Card>
      <CardContent>
        <Table>
          <AuditTableHead />
          <TableBody>
            <TableSkeletonRows cols={COLS} />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

async function AuditTable({
  q,
  status,
  keyId,
  page,
}: {
  q: string;
  status: string;
  keyId: string;
  page: number;
}) {
  const where: Prisma.McpAuditLogWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { tool: { contains: q, mode: "insensitive" as const } } : {}),
    // "none" = recusas anteriores à identificação da chave (header ausente,
    // chave inexistente). São justamente as linhas que revelam varredura.
    ...(keyId === "none"
      ? { apiKeyId: null }
      : keyId
        ? { apiKeyId: keyId }
        : {}),
  };

  // A3: `next build` roda sem DATABASE_URL — degrade, nunca lance.
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
  let keys: KeyOption[] = [];
  let failed = false;
  if (dbConfigured) {
    try {
      [rows, total, keys] = await Promise.all([
        db.mcpAuditLog.findMany({
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
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        db.mcpAuditLog.count({ where }),
        db.apiKey.findMany({
          select: { id: true, name: true, keyPrefix: true },
          orderBy: { createdAt: "desc" },
          take: KEY_OPTIONS_LIMIT,
        }),
      ]);
    } catch (err) {
      console.error("[admin] list mcp audit failed", err);
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card>
      <CardContent>
        <AuditToolbar
          q={q}
          status={status}
          keyId={keyId}
          keys={keys}
          page={page}
          totalPages={totalPages}
          total={total}
          position="top"
        />

        <Table>
          <AuditTableHead />
          <TableBody>
            {failed || !dbConfigured ? (
              <TableEmptyRow
                cols={COLS}
                destructive
                message={
                  dbConfigured
                    ? "Não foi possível carregar a auditoria."
                    : "Banco indisponível: DATABASE_URL não está configurada."
                }
              />
            ) : rows.length === 0 ? (
              <TableEmptyRow
                cols={COLS}
                message="Nenhuma chamada registrada com esses filtros."
              />
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="tabular-nums whitespace-nowrap text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {/* <details> nativo: os argumentos expandem sem um client
                        component por linha. O conteúdo já vem redigido e
                        truncado de `lib/mcp/redact.ts`. */}
                    <details className="group max-w-[420px]">
                      <summary className="cursor-pointer list-none font-mono text-xs marker:hidden">
                        {r.tool}
                        {r.argsSummary || r.result ? (
                          <span className="mt-0.5 block font-sans text-xs text-brand group-open:hidden">
                            ver detalhes ↓
                          </span>
                        ) : null}
                      </summary>
                      <div className="mt-2 space-y-2 border-l-2 border-brand/40 pl-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Argumentos
                          </p>
                          <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                            {r.argsSummary || "—"}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Resultado
                          </p>
                          <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                            {r.result || "—"}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {r.apiKey ? (
                      <Link
                        href={`/admin/audit?key=${r.apiKey.id}`}
                        className="font-medium transition-colors hover:text-brand"
                      >
                        {r.apiKey.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        não identificada
                      </span>
                    )}
                    <span className="block font-mono text-xs text-muted-foreground">
                      {r.keyPrefix ? `${r.keyPrefix}…` : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} styles={AUDIT_STATUS_STYLES} />
                    {r.reason ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {auditReasonLabel(r.reason)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.latencyMs === null
                      ? "—"
                      : `${formatNumber(r.latencyMs)} ms`}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    <span className="font-mono text-xs">{r.ip ?? "—"}</span>
                    {r.userAgent ? (
                      <span
                        className="mt-0.5 block max-w-48 truncate text-xs"
                        title={r.userAgent}
                      >
                        {r.userAgent}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <AuditToolbar
          q={q}
          status={status}
          keyId={keyId}
          keys={keys}
          page={page}
          totalPages={totalPages}
          total={total}
          position="bottom"
        />
      </CardContent>
    </Card>
  );
}
