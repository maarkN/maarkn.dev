import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  FunnelBoard,
  FunnelBoardSkeleton,
} from "@/components/admin/dashboard/funnel-board";
import {
  FunnelStats,
  FunnelStatsSkeleton,
} from "@/components/admin/dashboard/funnel-stats";
import {
  NextStepsCard,
  NextStepsSkeleton,
} from "@/components/admin/dashboard/next-steps-card";
import {
  PlatformStats,
  PlatformStatsSkeleton,
} from "@/components/admin/dashboard/platform-stats";
import {
  RecentEventsCard,
  RecentEventsSkeleton,
} from "@/components/admin/dashboard/recent-events-card";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";

/**
 * Dashboard do funil de carreira.
 *
 * Cada seção é um Server Component `async` dentro do seu próprio `<Suspense>`:
 * o esqueleto aparece por seção e uma consulta lenta não segura a página
 * inteira. As leituras vivem em `@/components/admin/dashboard/dashboard-data`,
 * memoizadas com `cache()` — os cartões de número e o funil visual leem o mesmo
 * snapshot e o banco é consultado uma vez por request.
 */

/** Guard de sessão: esta rota nunca é pré-renderizada. */
export const dynamic = "force-dynamic";

const SECTION_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        <PageHeader
          title="Dashboard"
          description="Funil de candidaturas: onde cada vaga está, o que trava o avanço e o que ainda não dá para medir."
          actions={
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/applications">
                  <Briefcase className="size-4" />
                  Ver o funil completo
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/admin/applications/new">
                  <Plus className="size-4" />
                  Nova candidatura
                </Link>
              </Button>
            </>
          }
        />

        {/* A3: sem DATABASE_URL a página renderiza, avisando em vez de mentir. */}
        {!dbConfigured && (
          <Card size="sm">
            <CardContent className="text-destructive">
              DATABASE_URL não está definida — nenhum número desta página pode
              ser calculado até o Postgres subir.
            </CardContent>
          </Card>
        )}

        <Suspense fallback={<FunnelStatsSkeleton />}>
          <FunnelStats />
        </Suspense>

        <Suspense fallback={<FunnelBoardSkeleton />}>
          <FunnelBoard />
        </Suspense>

        <div className="grid gap-4 xl:grid-cols-2">
          <Suspense fallback={<NextStepsSkeleton />}>
            <NextStepsCard />
          </Suspense>
          <Suspense fallback={<RecentEventsSkeleton />}>
            <RecentEventsCard />
          </Suspense>
        </div>

        <section className="space-y-2">
          <h2 className={SECTION_LABEL}>Resto do backoffice</h2>
          <Suspense fallback={<PlatformStatsSkeleton />}>
            <PlatformStats />
          </Suspense>
        </section>
      </div>
    </AdminShell>
  );
}
