import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollText, ShieldAlert } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
// Tudo aqui é instante real (criação, último uso, expiração, revogação):
// `formatDateTime` por A5 — `formatDate` é para data de calendário, em UTC.
import { formatDateTime } from "@/lib/format";
import { isKeyGenerationConfigured } from "@/lib/mcp/auth";
import { MCP_WRITE_SCOPES } from "@/lib/mcp/scopes";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  ListingIndexCell,
  ListingIndexHead,
  TableEmptyRow,
  TableLoadingRow,
} from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiKeysToolbar } from "./api-keys-toolbar";
import { CreateKeyDialog } from "./create-key-dialog";
import { KEY_STATUS_STYLES, isKeyStatus, keyStatusOf } from "./key-status";
import { RevokeKeyDialog } from "./revoke-key-dialog";

export const metadata: Metadata = {
  title: "Chaves de API · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

/** Guard + searchParams: nunca prerenderize esta rota. */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
// A coluna de índice conta: `colSpan` que mentir deixa a linha vazia curta.
const COLS = 8;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Instante de referência da página. Em escopo de módulo porque `Date.now()` no
 * corpo de um componente é sinalizado por `react-hooks/purity` — e porque a
 * mesma leitura precisa servir ao `where` do filtro e ao rótulo da linha, sob
 * pena de a lista dizer "ativa" e o `where` dizer "expirada".
 */
function nowMs(): number {
  return Date.now();
}

export default async function ApiKeysPage({
  searchParams,
}: PageProps<"/admin/api-keys">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const sp = await searchParams; // Next 16: searchParams é Promise
  const q = one(sp.q);
  const statusRaw = one(sp.status);
  const status = isKeyStatus(statusRaw) ? statusRaw : "";
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const pepperOk = isKeyGenerationConfigured();

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          title="Chaves de API"
          description="Credenciais do servidor MCP (POST /api/mcp). A chave em claro aparece uma única vez, na criação — o banco guarda só o HMAC."
          actions={
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/audit">
                  <ScrollText className="size-4" />
                  [ auditoria ]
                </Link>
              </Button>
              <CreateKeyDialog disabled={!dbConfigured || !pepperOk} />
            </div>
          }
        />

        {!dbConfigured ? (
          <Card size="sm">
            <CardContent className="text-destructive">
              DATABASE_URL não está definida — as chaves ficam indisponíveis.
            </CardContent>
          </Card>
        ) : null}

        {dbConfigured && !pepperOk ? (
          <Card size="sm">
            <CardContent className="flex items-start gap-2 text-destructive">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong>MCP_KEY_PEPPER não está configurada.</strong> Sem ela o
                servidor recusa toda chamada ao MCP com 503 e nenhuma chave pode
                ser criada. Gere com{" "}
                <code className="font-mono">openssl rand -base64 48</code> e
                reinicie o processo.
              </span>
            </CardContent>
          </Card>
        ) : null}

        <Suspense key={`${q}|${status}|${page}`} fallback={<KeysTableSkeleton />}>
          <ApiKeysTable q={q} status={status} page={page} />
        </Suspense>
      </div>
    </AdminShell>
  );
}

/* ── tabela ───────────────────────────────────────────────────────────────── */

function KeysTableHead() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <ListingIndexHead />
        <TableHead>nome</TableHead>
        <TableHead className="w-[14ch]">prefixo</TableHead>
        <TableHead className="hidden w-[30ch] lg:table-cell">escopos</TableHead>
        <TableHead className="hidden w-[20ch] md:table-cell">ultimo_uso</TableHead>
        <TableHead className="hidden w-[20ch] sm:table-cell">expira</TableHead>
        <TableHead className="w-[14ch]">situacao</TableHead>
        <TableHead className="w-[22ch] text-right">acoes</TableHead>
      </TableRow>
    </TableHeader>
  );
}

/** Estado 1 do §3: carregando. */
function KeysTableSkeleton() {
  return (
    <Table className="table-fixed">
      <KeysTableHead />
      <TableBody>
        <TableLoadingRow cols={COLS} />
      </TableBody>
    </Table>
  );
}

/**
 * `where` do filtro de situação, derivado das mesmas duas colunas que
 * `keyStatusOf` lê. Mantê-los lado a lado é o que impede a lista de mostrar um
 * rótulo que o filtro não encontra.
 */
function statusWhere(status: string, at: Date): Prisma.ApiKeyWhereInput {
  if (status === "revoked") return { revokedAt: { not: null } };
  if (status === "expired") {
    return { revokedAt: null, expiresAt: { lte: at } };
  }
  if (status === "active") {
    return {
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: at } }],
    };
  }
  return {};
}

async function ApiKeysTable({
  q,
  status,
  page,
}: {
  q: string;
  status: string;
  page: number;
}) {
  const at = new Date(nowMs());

  // `AND` explícito: o filtro de busca e o de situação usam `OR` cada um, e
  // dois `OR` no mesmo nível se sobrescreveriam.
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

  // A3: `next build` roda sem DATABASE_URL — degrade, nunca lance.
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
  let failed = false;
  if (dbConfigured) {
    try {
      [rows, total] = await Promise.all([
        db.apiKey.findMany({
          where,
          // `keyHash` NUNCA sai do banco: não vai para o HTML, nem para o RSC
          // payload, nem para um log. O select é explícito por isso.
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
          orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        db.apiKey.count({ where }),
      ]);
    } catch (err) {
      console.error("[admin] list api keys failed", err);
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-3">
      <ApiKeysToolbar
          q={q}
          status={status}
          page={page}
          totalPages={totalPages}
          total={total}
          position="top"
        />

        <Table className="table-fixed">
          <KeysTableHead />
          <TableBody>
            {failed || !dbConfigured ? (
              <TableEmptyRow
                cols={COLS}
                destructive
                message={
                  dbConfigured
                    ? "Não foi possível carregar as chaves."
                    : "Banco indisponível: DATABASE_URL não está configurada."
                }
              />
            ) : rows.length === 0 ? (
              <TableEmptyRow
                cols={COLS}
                message="Nenhuma chave encontrada. Crie a primeira para conectar a skill do Obsidian."
              />
            ) : (
              rows.map((r, index) => {
                const st = keyStatusOf(r, at.getTime());
                return (
                  <TableRow key={r.id} className="align-top">
                    <ListingIndexCell index={index} />
                    <TableCell>
                      <div className="truncate" title={r.name}>
                        {r.name}
                      </div>
                      <span className="block text-xs font-normal text-muted-foreground">
                        criada em {formatDateTime(r.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {r.keyPrefix}…
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex max-w-64 flex-wrap gap-1">
                        {r.scopes.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          r.scopes.map((s) => (
                            <span
                              key={s}
                              className={
                                (MCP_WRITE_SCOPES as readonly string[]).includes(
                                  s,
                                )
                                  ? "text-[10px] text-orange"
                                  : "text-[10px] text-muted-foreground"
                              }
                              title={
                                (MCP_WRITE_SCOPES as readonly string[]).includes(
                                  s,
                                )
                                  ? "Escopo de escrita"
                                  : "Escopo de leitura"
                              }
                            >
                              [{s}]
                            </span>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums text-muted-foreground">
                      {r.lastUsedAt ? formatDateTime(r.lastUsedAt) : "nunca"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">
                      {r.expiresAt ? formatDateTime(r.expiresAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={st} styles={KEY_STATUS_STYLES} />
                      {r.revokedAt ? (
                        <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
                          {formatDateTime(r.revokedAt)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/audit?key=${r.id}`}>[ chamadas ]</Link>
                        </Button>
                        {st === "revoked" ? null : (
                          <RevokeKeyDialog
                            id={r.id}
                            name={r.name}
                            keyPrefix={r.keyPrefix}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <ApiKeysToolbar
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
