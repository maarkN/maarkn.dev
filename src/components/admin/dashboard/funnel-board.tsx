import { TriangleAlert } from "lucide-react";
import { FunnelStageBadge } from "@/components/admin/status-badge";
import {
  TableEmptyRow,
  TableSkeletonRows,
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
import { EMPTY, formatNumber, formatPercent } from "@/lib/format";
import {
  buildFunnelView,
  loadFunnelSnapshot,
  type FunnelView,
} from "./dashboard-data";

/**
 * Funil visual por `funnel_stage`: ocupação atual, alcance acumulado e taxa de
 * conversão entre estágios consecutivos.
 *
 * **A coluna "Conversão" mostra "—" quando o denominador é zero.** Isso é
 * deliberado e é a razão de este painel existir: hoje quase nada chegou a
 * "Enviada", e escrever 0% ali afirmaria um fato falso ("houve tentativa e
 * nenhuma passou") em vez do fato verdadeiro ("ainda não há o que medir").
 * Esconder a coluna seria pior ainda — o buraco no dado é a informação.
 *
 * Ver `buildFunnelView` em `./dashboard-data` para como "Alcançaram" é
 * calculado a partir de colunas gravadas, sem inferir progresso.
 */

const COLS = 4;

function FunnelTableFrame({ children }: { children: React.ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Estágio</TableHead>
          <TableHead>Alcançaram</TableHead>
          <TableHead className="text-right">Agora</TableHead>
          <TableHead className="text-right">Conversão</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

function FunnelCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil por estágio</CardTitle>
        <CardDescription>
          “Alcançaram” conta quem comprovadamente passou por aqui; “Agora” é onde
          a candidatura parou. A conversão é sempre sobre o estágio anterior.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function FunnelBoardSkeleton() {
  return (
    <FunnelCard>
      <FunnelTableFrame>
        <TableSkeletonRows rows={8} cols={COLS} />
      </FunnelTableFrame>
    </FunnelCard>
  );
}

export async function FunnelBoard() {
  const snapshot = await loadFunnelSnapshot();

  if (snapshot.failed) {
    return (
      <FunnelCard>
        <FunnelTableFrame>
          <TableEmptyRow
            cols={COLS}
            destructive
            message={
              dbConfigured
                ? "Não foi possível carregar o funil."
                : "DATABASE_URL não configurada — o funil fica indisponível até o Postgres subir."
            }
          />
        </FunnelTableFrame>
      </FunnelCard>
    );
  }

  const view = buildFunnelView(snapshot);

  return (
    <FunnelCard>
      <FunnelTableFrame>
        {view.total === 0 ? (
          <TableEmptyRow
            cols={COLS}
            message="Nenhuma candidatura registrada ainda — o funil começa vazio."
          />
        ) : (
          view.rows.map((row) => (
            <FunnelRows key={row.stage} row={row} />
          ))
        )}
      </FunnelTableFrame>

      <ClosedOutcomes closed={view.closed} />
      <FunnelHonestyNote view={view} />
    </FunnelCard>
  );
}

/* ── uma linha do funil (+ o cabeçalho da fase, quando ela começa) ───────── */

function FunnelRows({ row }: { row: FunnelView["rows"][number] }) {
  return (
    <>
      {row.phaseStart && (
        <TableRow className="hover:bg-transparent">
          <TableCell
            colSpan={COLS}
            className="bg-muted/40 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            {row.phaseLabel}
          </TableCell>
        </TableRow>
      )}
      <TableRow>
        <TableCell>
          <FunnelStageBadge status={row.stage} />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-full min-w-16 bg-muted" aria-hidden>
              <div
                className="h-1.5 bg-brand"
                style={{ width: `${row.share}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right tabular-nums">
              {formatNumber(row.reached)}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">
          {formatNumber(row.current)}
        </TableCell>
        <TableCell
          className="text-right tabular-nums"
          // O "—" precisa ser legível como "sem dado", não como "zero".
          title={
            row.conversion === null
              ? "Sem denominador: nenhuma candidatura alcançou o estágio anterior."
              : undefined
          }
        >
          {row.conversion === null ? (
            <span className="text-muted-foreground">{EMPTY}</span>
          ) : (
            formatPercent(row.conversion, 1)
          )}
        </TableCell>
      </TableRow>
    </>
  );
}

/* ── desfechos fora do trilho ────────────────────────────────────────────── */

function ClosedOutcomes({ closed }: { closed: FunnelView["closed"] }) {
  const total = closed.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="space-y-1.5 border-t border-border pt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Encerradas fora do trilho · {formatNumber(total)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {closed.map((item) => (
          <span key={item.stage} className="inline-flex items-center gap-1.5">
            <FunnelStageBadge status={item.stage} />
            <span className="tabular-nums text-muted-foreground">
              {formatNumber(item.count)}
            </span>
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Recusada, retirada, sem resposta, ghosting e descartada não entram na
        sequência do funil: a ordem do enum as coloca depois de “Aceita”, mas
        isso é ordem de declaração, não progresso. Elas só contam no alcance dos
        estágios que <strong>as colunas provam</strong> que atingiram (
        <code className="font-mono">appliedAt</code>,{" "}
        <code className="font-mono">firstResponseAt</code>).
      </p>
    </div>
  );
}

/* ── o aviso de honestidade ──────────────────────────────────────────────── */

function FunnelHonestyNote({ view }: { view: FunnelView }) {
  if (view.sentReached === 0) {
    return (
      <div className="flex items-start gap-2 border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>Ainda não há dado de outcome.</strong> Nenhuma candidatura
          chegou a “Enviada”, então toda taxa a partir daí fica{" "}
          <strong>indefinida</strong> e aparece como “{EMPTY}”. Isso não é 0%:
          0% afirmaria que houve envio e nada avançou. O funil existe justamente
          para começar a coletar essa medida a partir do primeiro envio.
        </p>
      </div>
    );
  }

  if (view.undefinedRates > 0) {
    return (
      <div className="flex items-start gap-2 border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <p>
          {formatNumber(view.undefinedRates)} taxa(s) sem denominador: nenhuma
          candidatura alcançou o estágio anterior, então a conversão aparece como
          “{EMPTY}” em vez de 0%. Ausência de dado não é resultado zero.
        </p>
      </div>
    );
  }

  return null;
}
