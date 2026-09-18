import {
  Briefcase,
  CalendarClock,
  Hourglass,
  Laptop,
  PackageCheck,
  PlaneTakeoff,
  Radar,
} from "lucide-react";
import { StatCard } from "@/app/admin/_components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dbConfigured } from "@/lib/db";
import { EMPTY, formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { loadFunnelSnapshot } from "./dashboard-data";

/**
 * Cartões de número do funil. Uma leitura agregada (`loadFunnelSnapshot`,
 * memoizada por request) alimenta os sete — nenhum cartão dispara consulta
 * própria.
 *
 * As duas rotas aparecem como cartões SEPARADOS de propósito: patrocínio de
 * visto não é um booleano, e somar "remota B2B" com "relocação" num só número
 * apagaria justamente a distinção que decide a candidatura (ver o cabeçalho de
 * `@/lib/applications`).
 */

const TILES = 7;
const GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4";

export function FunnelStatsSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: TILES }, (_, i) => (
        <Card key={`funnel-stat-skeleton-${i}`} size="sm">
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export async function FunnelStats() {
  const snapshot = await loadFunnelSnapshot();

  if (snapshot.failed) {
    return (
      <Card size="sm">
        <CardContent className="text-destructive">
          {dbConfigured
            ? "Não foi possível carregar os números do funil."
            : "DATABASE_URL não configurada — os números do funil ficam indisponíveis até o Postgres subir."}
        </CardContent>
      </Card>
    );
  }

  const share = (value: number) =>
    snapshot.total > 0 ? formatPercent(value / snapshot.total, 0) : EMPTY;

  return (
    <div className={GRID}>
      <StatCard
        label="Candidaturas"
        value={formatNumber(snapshot.total)}
        hint={`${formatNumber(snapshot.sent)} já enviada(s)`}
        icon={Briefcase}
      />
      <StatCard
        label="Rota remota (B2B)"
        value={formatNumber(snapshot.routeRemote)}
        hint={`${share(snapshot.routeRemote)} do funil · sem gate de visto`}
        icon={Laptop}
      />
      <StatCard
        label="Rota de relocação"
        value={formatNumber(snapshot.routeRelocation)}
        hint={`${share(snapshot.routeRelocation)} do funil · patrocínio decide`}
        icon={PlaneTakeoff}
      />
      <StatCard
        label="Pacotes prontos"
        value={formatNumber(snapshot.readyToSend)}
        hint="prontos e ainda não enviados"
        icon={PackageCheck}
      />
      <StatCard
        label="Aguardando resposta"
        value={formatNumber(snapshot.awaitingReply)}
        hint={`enviadas sem retorno, de ${formatNumber(snapshot.sent)}`}
        icon={Hourglass}
      />
      <StatCard
        label="Entrevistas em aberto"
        value={formatNumber(snapshot.interviewsOpen)}
        hint={
          snapshot.nextInterviewAt
            ? `próxima em ${formatDateTime(snapshot.nextInterviewAt)}`
            : "nenhuma data futura marcada"
        }
        icon={CalendarClock}
      />
      <StatCard
        label="Radar sem triagem"
        value={formatNumber(snapshot.radarUntriaged)}
        hint={`de ${formatNumber(snapshot.radarTotal)} vaga(s) vista(s) no radar`}
        icon={Radar}
      />
    </div>
  );
}
