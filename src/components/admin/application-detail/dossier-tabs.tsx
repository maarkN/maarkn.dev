/**
 * As sete abas do dossiê de candidatura.
 *
 * ── Server Component, apesar do `<Tabs>` ───────────────────────────────────
 * `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` são Client Components (Radix),
 * mas o CONTEÚDO de cada aba é passado como `children` — logo continua sendo
 * renderizado no servidor e viaja como payload RSC. Nenhuma destas tabelas
 * entra no bundle do navegador; o único código de cliente aqui é o do Radix e o
 * da caixinha da checklist.
 *
 * Consequência prática, e o motivo de a consulta ser única: o Radix mantém o
 * conteúdo das abas inativas montado, então TODAS as sete já estão no payload
 * da primeira renderização. Buscar por aba não economizaria round-trip nenhum —
 * só transformaria uma consulta em sete (ver `../../../app/admin/applications/
 * [id]/dossier.ts`).
 *
 * ── Props narrow, não o payload inteiro ────────────────────────────────────
 * Cada aba recebe só o array de que precisa, com um tipo declarado aqui. Assim
 * este módulo não importa nada de `server-only` nem do Prisma em runtime, e o
 * TypeScript ainda barra qualquer divergência no ponto de uso — o `select` do
 * dossiê tem de continuar produzindo estas formas.
 */

import { ShieldAlert } from "lucide-react";
import type {
  CoverageLevel,
  DocKind,
  EventDirection,
  FunnelStage,
  Visibility,
} from "@prisma/client";
import { FunnelStageBadge } from "@/components/admin/status-badge";
import { TableEmptyRow } from "@/components/admin/table-pager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPTY, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { ChecklistToggle, type ChecklistToggleAction } from "./checklist-toggle";
import {
  CoverageBadge,
  DocKindBadge,
  DocStatusBadge,
  EVENT_DIRECTION_LABELS,
  HonestySeverityBadge,
  InterviewOutcomeBadge,
  eventChannelLabel,
  eventTypeLabel,
  interviewKindLabel,
} from "./detail-badges";
import { MarkdownBlock } from "./detail-row";

/* ── formas dos dados (espelham o `select` de `dossier.ts`) ───────────────── */

export interface DossierDocument {
  id: string;
  filePath: string;
  kind: DocKind;
  title: string | null;
  language: string | null;
  status: string | null;
  wordCount: number | null;
  sentAt: Date | null;
  updatedAt: Date;
  visibility: Visibility;
}

export interface DossierArtifact {
  id: string;
  path: string;
  kind: string;
  mimeType: string | null;
  sizeBytes: number | null;
  contentStored: boolean;
  generatedAt: Date | null;
  document: { id: string; title: string | null; filePath: string } | null;
}

export interface DossierEvent {
  id: string;
  occurredAt: Date;
  type: string;
  direction: EventDirection | null;
  fromStage: FunnelStage | null;
  toStage: FunnelStage | null;
  channel: string | null;
  subject: string | null;
  bodyMd: string | null;
  contact: { id: string; name: string } | null;
  document: { id: string; title: string | null; filePath: string } | null;
}

export interface DossierCoverage {
  id: string;
  orderIndex: number;
  requirement: string;
  requirementKey: string;
  coverage: CoverageLevel;
  evidenceMd: string | null;
}

export interface DossierScreeningQuestion {
  id: string;
  orderIndex: number;
  question: string;
  answer: string | null;
  language: string | null;
  required: boolean;
}

export interface DossierHonestyNote {
  id: string;
  ruleCode: string | null;
  scope: string | null;
  noteMd: string;
  severity: string;
  createdAt: Date;
}

export interface DossierInterview {
  id: string;
  round: number | null;
  kind: string;
  scheduledAt: Date | null;
  durationMin: number | null;
  mode: string | null;
  timezone: string | null;
  interviewers: string[];
  prepMd: string | null;
  notesMd: string | null;
  outcome: string | null;
  contact: { id: string; name: string } | null;
}

export interface DossierChecklistItem {
  id: string;
  orderIndex: number;
  label: string;
  groupLabel: string | null;
  done: boolean;
  doneAt: Date | null;
}

/* ── util ─────────────────────────────────────────────────────────────────── */

function formatBytes(value: number | null): string {
  if (value === null) return EMPTY;
  if (value < 1024) return `${formatNumber(value)} B`;
  if (value < 1024 * 1024) return `${formatNumber(Math.round(value / 1024))} kB`;
  return `${formatNumber(Math.round(value / (1024 * 1024)))} MB`;
}

function TabCount({ value }: { value: number }) {
  return <span className="tabular-nums text-muted-foreground">({value})</span>;
}

/**
 * Uma aba em notação de colchete, sobre o `TabsTrigger` do shadcn.
 *
 * O Radix continua por baixo de propósito: ele entrega `role="tablist"`,
 * `aria-selected`, a navegação por setas e o `tabindex` móvel. Reescrever isso
 * à mão para ganhar um par de colchetes custaria caro e quebraria — o colchete
 * é `aria-hidden`, é pintura.
 *
 * A aba ativa: fundo `--sel` e um marcador `--purple`. O design pedia o TEXTO
 * ativo em `--purple`, e `--purple` sobre `--sel` mede 4.07:1 — abaixo de AA.
 * O roxo migrou para o marcador (um componente de interface, piso de 3:1, que
 * ele passa) e o texto ativo ficou em `--fg`, 8.46:1 sobre `--sel`. O `!` nas
 * duas classes é necessário: a variante `line` do primitive já declara
 * `data-active:bg-transparent` e `after:bg-foreground` com a mesma
 * especificidade, e a ordem entre elas é a do Tailwind, não a da marcação.
 */
function DossierTab({
  value,
  label,
  count,
}: {
  value: string;
  label: string;
  count: number;
}) {
  return (
    <TabsTrigger
      value={value}
      className="h-8 flex-none gap-1 px-2 data-active:bg-sel! data-active:text-fg after:bg-purple!"
    >
      <span aria-hidden>[</span>
      {label}
      <TabCount value={count} />
      <span aria-hidden>]</span>
    </TabsTrigger>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

/** Caminho do vault: o dado que identifica a linha, sempre em `font-mono`. */
function SourcePath({ value }: { value: string }) {
  return (
    <span className="font-mono text-xs break-all text-muted-foreground">
      {value}
    </span>
  );
}

/* ── componente principal ─────────────────────────────────────────────────── */

export function ApplicationDossierTabs({
  documents,
  artifacts,
  events,
  coverages,
  questions,
  honestyNotes,
  interviews,
  checklistItems,
  checklistAction,
}: {
  documents: DossierDocument[];
  artifacts: DossierArtifact[];
  events: DossierEvent[];
  coverages: DossierCoverage[];
  questions: DossierScreeningQuestion[];
  honestyNotes: DossierHonestyNote[];
  interviews: DossierInterview[];
  checklistItems: DossierChecklistItem[];
  /** Referência de Server Action — serializável, atravessa a fronteira. */
  checklistAction: ChecklistToggleAction;
}) {
  return (
    <Tabs defaultValue="documents">
      <TabsList
        variant="line"
        className="h-auto w-full flex-wrap justify-start gap-x-3"
      >
        <DossierTab
          value="documents"
          label="documentos"
          count={documents.length + artifacts.length}
        />
        <DossierTab value="timeline" label="timeline" count={events.length} />
        <DossierTab
          value="coverage"
          label="cobertura"
          count={coverages.length}
        />
        <DossierTab value="screening" label="triagem" count={questions.length} />
        <DossierTab
          value="honesty"
          label="honestidade"
          count={honestyNotes.length}
        />
        <DossierTab
          value="interviews"
          label="entrevistas"
          count={interviews.length}
        />
        <DossierTab
          value="checklist"
          label="checklist"
          count={checklistItems.length}
        />
      </TabsList>

      <TabsContent value="documents">
        <DocumentsTab documents={documents} artifacts={artifacts} />
      </TabsContent>
      <TabsContent value="timeline">
        <TimelineTab events={events} />
      </TabsContent>
      <TabsContent value="coverage">
        <CoverageTab coverages={coverages} />
      </TabsContent>
      <TabsContent value="screening">
        <ScreeningTab questions={questions} />
      </TabsContent>
      <TabsContent value="honesty">
        <HonestyTab notes={honestyNotes} />
      </TabsContent>
      <TabsContent value="interviews">
        <InterviewsTab interviews={interviews} />
      </TabsContent>
      <TabsContent value="checklist">
        <ChecklistTab items={checklistItems} action={checklistAction} />
      </TabsContent>
    </Tabs>
  );
}

/* ── 1. documentos + artefatos ────────────────────────────────────────────── */

const DOC_COLS = 6;
const ARTIFACT_COLS = 5;

function DocumentsTab({
  documents,
  artifacts,
}: {
  documents: DossierDocument[];
  artifacts: DossierArtifact[];
}) {
  return (
    <Card>
      <CardContent className="space-y-6">
        <div>
          <SectionTitle>Documentos do pacote</SectionTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Idioma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Palavras</TableHead>
                <TableHead>Enviado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableEmptyRow
                  cols={DOC_COLS}
                  message="Nenhum documento sincronizado para esta candidatura."
                />
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="font-medium">
                        {doc.title || doc.filePath.split("/").pop() || EMPTY}
                      </div>
                      <SourcePath value={doc.filePath} />
                    </TableCell>
                    <TableCell>
                      <DocKindBadge status={doc.kind} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.language || EMPTY}
                    </TableCell>
                    <TableCell>
                      <DocStatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {doc.wordCount === null
                        ? EMPTY
                        : formatNumber(doc.wordCount)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {/* Data de calendário vinda do vault (§A5). */}
                      {formatDate(doc.sentAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div>
          <SectionTitle>Artefatos gerados (PDF, DOCX, HTML)</SectionTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caminho</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead className="text-right">Tamanho</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Gerado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artifacts.length === 0 ? (
                <TableEmptyRow
                  cols={ARTIFACT_COLS}
                  message="Nenhum artefato registrado — o binário nunca sobe pelo MCP, só a referência."
                />
              ) : (
                artifacts.map((artifact) => (
                  <TableRow key={artifact.id}>
                    <TableCell>
                      <SourcePath value={artifact.path} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">
                        {artifact.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBytes(artifact.sizeBytes)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {artifact.document?.title ??
                        artifact.document?.filePath ??
                        EMPTY}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatDateTime(artifact.generatedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 2. timeline ──────────────────────────────────────────────────────────── */

const EVENT_COLS = 4;

function TimelineTab({ events }: { events: DossierEvent[] }) {
  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Quando</TableHead>
              <TableHead className="w-56">Evento</TableHead>
              <TableHead className="w-32">Canal</TableHead>
              <TableHead>Detalhe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableEmptyRow
                cols={EVENT_COLS}
                message="Nenhum evento registrado. Mover o estágio ou registrar um evento cria a primeira linha."
              />
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="align-top tabular-nums">
                    {/* Instante do sistema, não data de calendário (§A5). */}
                    {formatDateTime(event.occurredAt)}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">
                        {eventTypeLabel(event.type)}
                      </span>
                      {event.direction && (
                        <Badge variant="outline" className="font-normal">
                          {EVENT_DIRECTION_LABELS[event.direction] ??
                            event.direction}
                        </Badge>
                      )}
                    </div>
                    {(event.fromStage || event.toStage) && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <FunnelStageBadge status={event.fromStage} />
                        <span className="text-muted-foreground">→</span>
                        <FunnelStageBadge status={event.toStage} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    {event.channel ? eventChannelLabel(event.channel) : EMPTY}
                    {event.contact && (
                      <div className="text-xs">{event.contact.name}</div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {event.subject && (
                      <div className="font-medium">{event.subject}</div>
                    )}
                    <MarkdownBlock value={event.bodyMd} clamp />
                    {event.document && (
                      <SourcePath value={event.document.filePath} />
                    )}
                    {!event.subject && !event.bodyMd && !event.document && (
                      <span className="text-muted-foreground">{EMPTY}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── 3. cobertura de requisitos ───────────────────────────────────────────── */

const COVERAGE_COLS = 4;

function CoverageTab({ coverages }: { coverages: DossierCoverage[] }) {
  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-right">#</TableHead>
              <TableHead>Requisito</TableHead>
              <TableHead className="w-36">Nível</TableHead>
              <TableHead>Evidência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverages.length === 0 ? (
              <TableEmptyRow
                cols={COVERAGE_COLS}
                message="Nenhuma matriz de requisitos sincronizada para esta candidatura."
              />
            ) : (
              coverages.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-right align-top tabular-nums text-muted-foreground">
                    {row.orderIndex + 1}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="font-medium">{row.requirement}</div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.requirementKey}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <CoverageBadge status={row.coverage} />
                  </TableCell>
                  <TableCell className="align-top">
                    <MarkdownBlock value={row.evidenceMd} clamp />
                    {!row.evidenceMd && (
                      <span className="text-muted-foreground">{EMPTY}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── 4. triagem ───────────────────────────────────────────────────────────── */

const SCREENING_COLS = 4;

function ScreeningTab({
  questions,
}: {
  questions: DossierScreeningQuestion[];
}) {
  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-right">#</TableHead>
              <TableHead>Pergunta</TableHead>
              <TableHead>Resposta usada</TableHead>
              <TableHead className="w-24">Idioma</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableEmptyRow
                cols={SCREENING_COLS}
                message="Nenhuma pergunta de triagem registrada."
              />
            ) : (
              questions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-right align-top tabular-nums text-muted-foreground">
                    {row.orderIndex + 1}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="font-medium">{row.question}</div>
                    {row.required && (
                      <Badge variant="outline" className="mt-1 font-normal">
                        Obrigatória
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <MarkdownBlock value={row.answer} />
                    {!row.answer && (
                      <span className="text-muted-foreground">
                        (a preencher)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    {row.language || EMPTY}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── 5. notas de honestidade ──────────────────────────────────────────────── */

const HONESTY_COLS = 4;

function HonestyTab({ notes }: { notes: DossierHonestyNote[] }) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="size-4 shrink-0 text-amber-500" />
          As linhas com ⚠️ do vault. São regras de enquadramento que o gerador de
          CV precisa obedecer — “bloqueante” significa que um texto que as viole
          é rejeitado, não corrigido.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Severidade</TableHead>
              <TableHead className="w-20">Regra</TableHead>
              <TableHead className="w-40">Escopo</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.length === 0 ? (
              <TableEmptyRow
                cols={HONESTY_COLS}
                message="Nenhuma nota de honestidade para esta candidatura."
              />
            ) : (
              notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="align-top">
                    <HonestySeverityBadge status={note.severity} />
                  </TableCell>
                  <TableCell className="align-top font-mono text-xs">
                    {note.ruleCode || EMPTY}
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    {note.scope || EMPTY}
                  </TableCell>
                  <TableCell className="align-top">
                    <MarkdownBlock value={note.noteMd} className="text-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── 6. entrevistas ───────────────────────────────────────────────────────── */

const INTERVIEW_COLS = 6;

function InterviewsTab({ interviews }: { interviews: DossierInterview[] }) {
  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-right">Rodada</TableHead>
              <TableHead className="w-36">Tipo</TableHead>
              <TableHead className="w-40">Quando</TableHead>
              <TableHead className="w-36">Formato</TableHead>
              <TableHead>Participantes</TableHead>
              <TableHead className="w-28">Desfecho</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interviews.length === 0 ? (
              <TableEmptyRow
                cols={INTERVIEW_COLS}
                message="Nenhuma entrevista registrada."
              />
            ) : (
              interviews.map((interview) => (
                <TableRow key={interview.id}>
                  <TableCell className="text-right align-top tabular-nums">
                    {interview.round ?? EMPTY}
                  </TableCell>
                  <TableCell className="align-top font-medium">
                    {interviewKindLabel(interview.kind)}
                  </TableCell>
                  <TableCell className="align-top tabular-nums">
                    {formatDateTime(interview.scheduledAt)}
                    {interview.timezone && (
                      <div className="text-xs text-muted-foreground">
                        {interview.timezone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    {interview.mode || EMPTY}
                    {interview.durationMin != null && (
                      <div className="text-xs tabular-nums">
                        {formatNumber(interview.durationMin)} min
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {interview.interviewers.length > 0
                      ? interview.interviewers.join(", ")
                      : (interview.contact?.name ?? EMPTY)}
                    <MarkdownBlock value={interview.notesMd} clamp />
                  </TableCell>
                  <TableCell className="align-top">
                    <InterviewOutcomeBadge status={interview.outcome} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── 7. checklist ─────────────────────────────────────────────────────────── */

const CHECKLIST_COLS = 4;

function ChecklistTab({
  items,
  action,
}: {
  items: DossierChecklistItem[];
  action: ChecklistToggleAction;
}) {
  const done = items.filter((item) => item.done).length;
  return (
    <Card>
      <CardContent className="space-y-3">
        {items.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="tabular-nums">
              {formatNumber(done)} de {formatNumber(items.length)}
            </span>{" "}
            concluído(s).
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Item</TableHead>
              <TableHead className="w-48">Grupo</TableHead>
              <TableHead className="w-44">Concluído em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableEmptyRow
                cols={CHECKLIST_COLS}
                message="Nenhum item de checklist para esta candidatura."
              />
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <ChecklistToggle
                      itemId={item.id}
                      done={item.done}
                      label={item.label}
                      action={action}
                    />
                  </TableCell>
                  <TableCell
                    className={
                      item.done ? "text-muted-foreground line-through" : ""
                    }
                  >
                    {item.label}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.groupLabel || EMPTY}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDateTime(item.doneAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

