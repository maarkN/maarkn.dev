import Link from "next/link";
import { CalendarClock, ListChecks } from "lucide-react";
import { FunnelStageBadge } from "@/components/admin/status-badge";
import {
  TableEmptyRow,
  TableLoadingRow,
} from "@/components/admin/table-pager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dbConfigured } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { loadNextSteps } from "./dashboard-data";

/**
 * Próximos passos: entrevistas marcadas ainda em aberto (têm `scheduledAt`,
 * então dá para ordenar e marcar atraso) e candidaturas com lembrete de
 * follow-up.
 *
 * O follow-up aparece SEM data porque `Application.followUp` é texto livre no
 * schema — metade das linhas do vault é "cobrar em 2 semanas", não uma data.
 * Inventar um vencimento a partir desse texto seria fabricar dado; a descrição
 * do cartão diz isso em vez de esconder.
 */

const COLS = 3;
const LIMIT = 8;

function NextStepsFrame({ children }: { children: React.ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Candidatura</TableHead>
          <TableHead>O que fazer</TableHead>
          <TableHead className="text-right">Quando</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

function NextStepsCardShell({
  description,
  children,
}: {
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="size-4 text-muted-foreground" />
          Próximos passos
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function NextStepsSkeleton() {
  return (
    <NextStepsCardShell description="Entrevistas marcadas e follow-ups pendentes.">
      <NextStepsFrame>
        <TableLoadingRow cols={COLS} />
      </NextStepsFrame>
    </NextStepsCardShell>
  );
}

export async function NextStepsCard() {
  const result = await loadNextSteps(LIMIT);

  return (
    <NextStepsCardShell
      description={
        result.failed
          ? "Entrevistas marcadas e follow-ups pendentes."
          : `Entrevistas em aberto e ${formatNumber(result.followUpTotal)} follow-up(s) em candidatura viva. O follow-up é texto livre no vault — não tem data de vencimento para cobrar.`
      }
    >
      <NextStepsFrame>
        {result.failed ? (
          <TableEmptyRow
            cols={COLS}
            destructive
            message={
              dbConfigured
                ? "Não foi possível carregar os próximos passos."
                : "DATABASE_URL não configurada — sem próximos passos até o Postgres subir."
            }
          />
        ) : result.items.length === 0 ? (
          <TableEmptyRow
            cols={COLS}
            message="Nenhuma entrevista marcada nem follow-up pendente."
          />
        ) : (
          result.items.map((item) => (
            <TableRow key={item.key}>
              <TableCell>
                <Link
                  href={`/admin/applications/${item.applicationId}/edit`}
                  className="font-medium transition-colors hover:text-brand"
                >
                  {item.company}
                </Link>
                <div className="truncate text-xs text-muted-foreground">
                  {item.role ?? "—"}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {item.kind === "interview" ? (
                    <CalendarClock className="size-4 shrink-0 text-violet-500" />
                  ) : (
                    <ListChecks className="size-4 shrink-0 text-amber-500" />
                  )}
                  <span className="truncate">{item.detail || "—"}</span>
                </div>
                <div className="pt-0.5">
                  <FunnelStageBadge status={item.stage} />
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.at ? (
                  <>
                    {formatDateTime(item.at)}
                    {item.overdue && (
                      <div className="pt-0.5 text-destructive">
                        [sem_desfecho]
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    sem data no vault
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </NextStepsFrame>
    </NextStepsCardShell>
  );
}
