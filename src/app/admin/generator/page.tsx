import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import {
  ListingIndexCell,
  ListingIndexHead,
  TableEmptyRow,
  TableLoadingRow,
} from "@/components/admin/table-pager";
import { GeneratorForm } from "@/components/admin/generator-form";
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
import { GenerationsToolbar } from "./generations-toolbar";
import { languageLabel } from "./languages";

export const metadata: Metadata = {
  title: "Gerador · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

/** Guard + searchParams: never prerender this route. */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;
// A coluna de índice conta: `colSpan` que mentir deixa a linha vazia curta.
const COLS = 6;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function GeneratorPage({
  searchParams,
}: PageProps<"/admin/generator">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const sp = await searchParams; // Next 16: searchParams is a Promise
  const q = one(sp.q);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          title="Gerador"
          description="Cole uma descrição de vaga: o RAG puxa os trechos mais relevantes do seu CV e dos dossiês e redige currículo, carta e respostas de triagem."
        />

        {!dbConfigured ? (
          <Card size="sm">
            <CardContent className="text-destructive">
              DATABASE_URL não está definida — gerar e listar ficam
              indisponíveis.
            </CardContent>
          </Card>
        ) : null}

        <GeneratorForm />

        {/* §1: a listagem é saída de comando — sem cartão, raio ou sombra em
            volta. O título da seção vira o comentário que precede a saída. */}
        <section className="space-y-3">
          <h2 className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Gerações recentes
          </h2>
          <p className="text-xs text-comment">
            # histórico gravado no banco — “Abrir” leva à versão de impressão
          </p>
          <Suspense key={`${q}|${page}`} fallback={<GenerationsSkeleton />}>
            <GenerationsTable q={q} page={page} />
          </Suspense>
        </section>
      </div>
    </AdminShell>
  );
}

/* ── table ────────────────────────────────────────────────────────────────── */

function GenerationsTableHead() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <ListingIndexHead />
        <TableHead>vaga</TableHead>
        <TableHead className="hidden md:table-cell">empresa</TableHead>
        <TableHead className="hidden w-[10ch] sm:table-cell">idioma</TableHead>
        <TableHead className="hidden w-[20ch] md:table-cell">criada</TableHead>
        <TableHead className="w-[12ch] text-right">acoes</TableHead>
      </TableRow>
    </TableHeader>
  );
}

/** State 1 of §3: loading. */
function GenerationsSkeleton() {
  return (
    <Table className="table-fixed">
      <GenerationsTableHead />
      <TableBody>
        <TableLoadingRow cols={COLS} />
      </TableBody>
    </Table>
  );
}

async function GenerationsTable({ q, page }: { q: string; page: number }) {
  const where = q
    ? {
        OR: [
          { roleTitle: { contains: q, mode: "insensitive" as const } },
          { company: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  // A3: `next build` runs without DATABASE_URL — degrade, never throw.
  let rows: {
    id: string;
    company: string | null;
    roleTitle: string | null;
    language: string;
    createdAt: Date;
  }[] = [];
  let total = 0;
  let failed = false;
  if (dbConfigured) {
    try {
      [rows, total] = await Promise.all([
        db.generation.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            company: true,
            roleTitle: true,
            language: true,
            createdAt: true,
          },
        }),
        db.generation.count({ where }),
      ]);
    } catch (err) {
      console.error("[admin] list generations failed", err);
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <GenerationsToolbar
        q={q}
        page={page}
        totalPages={totalPages}
        total={total}
        position="top"
      />

      <Table className="table-fixed">
        <GenerationsTableHead />
        <TableBody>
          {failed || !dbConfigured ? (
            <TableEmptyRow
              cols={COLS}
              destructive
              message={
                dbConfigured
                  ? "Não foi possível carregar as gerações."
                  : "Banco indisponível: DATABASE_URL não está configurada."
              }
            />
          ) : rows.length === 0 ? (
            <TableEmptyRow cols={COLS} message="Nada gerado ainda." />
          ) : (
            rows.map((g, index) => (
              <TableRow key={g.id}>
                <ListingIndexCell index={index} />
                <TableCell title={g.roleTitle ?? undefined}>
                  {g.roleTitle || "vaga sem título"}
                </TableCell>
                <TableCell
                  className="hidden md:table-cell text-muted-foreground"
                  title={g.company ?? undefined}
                >
                  {g.company || "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-cyan">
                  <span title={languageLabel(g.language)}>[{g.language}]</span>
                </TableCell>
                <TableCell className="hidden md:table-cell tabular-nums text-muted-foreground">
                  {formatDateTime(g.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/generator/${g.id}`}>
                      <FileText className="size-4" />
                      Abrir
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <GenerationsToolbar
        q={q}
        page={page}
        totalPages={totalPages}
        total={total}
        position="bottom"
      />
    </>
  );
}
