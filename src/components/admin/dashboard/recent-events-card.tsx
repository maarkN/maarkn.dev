import Link from "next/link";
import { ArrowRight, History, Inbox, Send } from "lucide-react";
import { FunnelStageBadge } from "@/components/admin/status-badge";
import {
  TableEmptyRow,
  TableSkeletonRows,
} from "@/components/admin/table-pager";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTime } from "@/lib/format";
import { EVENT_TYPE_LABELS, loadRecentEvents } from "./dashboard-data";

/**
 * Últimos `ApplicationEvent`. É o histórico bruto do funil — o que o dashboard
 * consegue afirmar sobre movimento real, sem inferir nada do estágio atual.
 *
 * `occurredAt` é um instante de sistema, então usa `formatDateTime` (A5).
 */

const COLS = 3;
const LIMIT = 8;

function EventsFrame({ children }: { children: React.ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Quando</TableHead>
          <TableHead>Evento</TableHead>
          <TableHead>Candidatura</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

function EventsCardShell({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          Últimos eventos
        </CardTitle>
        <CardDescription>
          Os {LIMIT} registros mais recentes de `application_event` — envios,
          respostas, mudanças de estágio e notas.
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function RecentEventsSkeleton() {
  return (
    <EventsCardShell>
      <EventsFrame>
        <TableSkeletonRows rows={5} cols={COLS} />
      </EventsFrame>
    </EventsCardShell>
  );
}

export async function RecentEventsCard() {
  const result = await loadRecentEvents(LIMIT);

  return (
    <EventsCardShell>
      <EventsFrame>
        {result.failed ? (
          <TableEmptyRow
            cols={COLS}
            destructive
            message={
              dbConfigured
                ? "Não foi possível carregar os eventos."
                : "DATABASE_URL não configurada — sem histórico até o Postgres subir."
            }
          />
        ) : result.rows.length === 0 ? (
          <TableEmptyRow
            cols={COLS}
            message="Nenhum evento registrado ainda."
          />
        ) : (
          result.rows.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatDateTime(event.occurredAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {event.direction === "inbound" ? (
                    <Inbox className="size-4 shrink-0 text-emerald-500" />
                  ) : event.direction === "outbound" ? (
                    <Send className="size-4 shrink-0 text-blue-500" />
                  ) : null}
                  <Badge variant="outline" className="font-normal">
                    {EVENT_TYPE_LABELS[event.type] ?? event.type}
                  </Badge>
                  {event.channel && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {event.channel}
                    </span>
                  )}
                </div>
                {event.toStage && (
                  <div className="flex items-center gap-1 pt-1">
                    {event.fromStage && (
                      <>
                        <FunnelStageBadge status={event.fromStage} />
                        <ArrowRight className="size-3 text-muted-foreground" />
                      </>
                    )}
                    <FunnelStageBadge status={event.toStage} />
                  </div>
                )}
                {event.subject && (
                  <div className="truncate pt-0.5 text-xs text-muted-foreground">
                    {event.subject}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/applications/${event.applicationId}/edit`}
                  className="font-medium transition-colors hover:text-brand"
                >
                  {event.company}
                </Link>
                <div className="truncate text-xs text-muted-foreground">
                  {event.role ?? "—"}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </EventsFrame>
    </EventsCardShell>
  );
}
