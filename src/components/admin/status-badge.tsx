/**
 * Enum → etiqueta de colchete. Um `Record<string, StatusStyle>` por enum,
 * todos montados por `makeStatusBadge`, então um enum novo só precisa de um
 * mapa de estilo.
 *
 * ── Colchete, não pílula ─────────────────────────────────────────────────
 * O que aparece na tela é `[applied]`, `[offer]`, `[blocked]`: o VALOR CRU do
 * enum entre colchetes, sem fundo, sem borda e sem raio — a notação que a
 * saída de um comando usaria. O rótulo em pt-BR não se perde: ele vai para o
 * `title`, e `statusLabelFrom` continua sendo a fonte dos `<Select>` e
 * filtros, que são onde a frase legível importa.
 *
 * ── Cor: os tokens do tema, não a escala do Tailwind ──────────────────────
 * As cores são os tokens de texto do tema (`text-ok`, `text-warn`, `text-ink-3`,
 * `text-beam-2`…) e o `--destructive`, medidos sobre toda superfície em que uma
 * etiqueta aparece (scripts/check-contrast.ts). O feixe fica de fora: é a cor
 * do que se clica, e etiqueta não se clica. Na linha sob o cursor o
 * `.admin-listing` leva todo o texto para `--foreground`.
 *
 * Valor desconhecido nunca quebra: cai em `text-ink-3` com a chave crua,
 * que é o que se quer enquanto um enum ainda está crescendo.
 */

import type { FunnelStage } from "@prisma/client";
import {
  APPLICATION_SOURCES,
  FUNNEL_STAGES,
  FUNNEL_STAGE_LABELS,
  FUNNEL_STAGE_PHASES,
  SOURCE_LABELS,
  SPONSORSHIP_GATES,
  SPONSORSHIP_LABELS,
  SPONSORSHIP_SIGNALS,
  type ApplicationSource,
  type FunnelPhaseKey,
  type SponsorshipGate,
} from "@/lib/applications";
import { EMPTY } from "@/lib/format";
import type { ProjectCategory, ProjectStatus } from "@/lib/projects";
import { cn } from "@/lib/utils";

export interface StatusStyle {
  label: string;
  className: string;
}

export type StatusStyles = Record<string, StatusStyle>;

/** Props of every badge produced by `makeStatusBadge`. */
export interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

/** Generic renderer — use it directly for a one-off map. */
export function StatusBadge({
  status,
  styles,
  className,
}: StatusBadgeProps & { styles: StatusStyles }) {
  if (!status) {
    return <span className={cn("text-ink-3", className)}>{EMPTY}</span>;
  }
  const style = styles[status];
  return (
    <span
      data-slot="status-tag"
      // O rótulo legível não some: vira o `title` da etiqueta.
      title={style?.label ?? status}
      className={cn(
        "whitespace-nowrap",
        style?.className ?? "text-ink-3",
        className,
      )}
    >
      [{status}]
    </span>
  );
}

/**
 * Bind a style map into a standalone badge component.
 *
 *   export const FunnelStageBadge = makeStatusBadge(FUNNEL_STAGE_STYLES, "FunnelStage");
 *   <FunnelStageBadge status={application.stage} />
 */
export function makeStatusBadge(styles: StatusStyles, displayName?: string) {
  function BoundStatusBadge({ status, className }: StatusBadgeProps) {
    return <StatusBadge status={status} styles={styles} className={className} />;
  }
  BoundStatusBadge.displayName = displayName
    ? `${displayName}Badge`
    : "StatusBadge";
  return BoundStatusBadge;
}

/** `styles[key].label` with the raw key as fallback — for selects and filters. */
export function statusLabelFrom(styles: StatusStyles, key: string): string {
  return styles[key]?.label ?? key;
}

/* ── Application.stage (`funnel_stage`) — src/lib/applications.ts ────────── */

/**
 * 21 estagios, 4 cores — e as quatro cores saem da FASE, nao do estagio, e a
 * fase sai de `FUNNEL_STAGE_PHASES`, o mesmo agrupamento que a consulta, o
 * `<Select>` da lista e o board ja usam. Nao existe um terceiro lugar que
 * decida cor por estagio: derivar daqui e o que garante que um estagio novo
 * no enum nasca colorido em vez de cair num default.
 *
 * O mapa `outcome` e o unico com quebra interna, e a quebra e deliberada: o
 * desfecho bom (`offer`, `accepted`) e o desfecho perdido (`rejected`) nao
 * podem ter a mesma cor, e os quatro abandonos (`withdrawn`, `no_response`,
 * `ghosted`, `skipped`) nao sao nem uma coisa nem outra — sao arquivo morto e
 * ficam na cor de comentario.
 */
export const FUNNEL_PHASE_TONES: Record<FunnelPhaseKey, string> = {
  pre_send: "text-ink-3",
  sent: "text-beam-2",
  evaluation: "text-warn",
  outcome: "text-ok",
};

/** Excecoes dentro de `outcome`. Chave ausente = a cor da fase. */
const OUTCOME_TONE: Partial<Record<FunnelStage, string>> = {
  rejected: "text-destructive",
  withdrawn: "text-ink-3",
  no_response: "text-ink-3",
  ghosted: "text-ink-3",
  skipped: "text-ink-3",
};

/**
 * `Record<FunnelStage, string>` montado a partir das fases. O `satisfies` em
 * `FUNNEL_STAGES` ja garante que as fases cobrem o enum inteiro, entao este
 * mapa tem os 21 estagios por construcao — nenhum cai em cor padrao.
 */
export const FUNNEL_STAGE_TONES = Object.fromEntries(
  FUNNEL_STAGE_PHASES.flatMap((phase) =>
    phase.stages.map((stage) => [
      stage,
      OUTCOME_TONE[stage] ?? FUNNEL_PHASE_TONES[phase.key],
    ]),
  ),
) as Record<FunnelStage, string>;

/** Rotulos vem de `src/lib/applications.ts` — nunca duplicados aqui. */
export const FUNNEL_STAGE_STYLES: StatusStyles = Object.fromEntries(
  FUNNEL_STAGES.map((stage) => [
    stage,
    {
      label: FUNNEL_STAGE_LABELS[stage],
      className: FUNNEL_STAGE_TONES[stage],
    },
  ]),
);

export const FunnelStageBadge = makeStatusBadge(
  FUNNEL_STAGE_STYLES,
  "FunnelStage",
);

/* ── Application.sponsorship (`sponsorship_signal`) ───────────────────────── */

/**
 * A cor sai do GATE (`SPONSORSHIP_GATES`), nao do sinal. `not_applicable_b2b`
 * — a rota remota, foco atual — fica em azul de marca e nao em verde/vermelho
 * de proposito: ela nao e "aprovada" nem "reprovada" no gate de visto, ela esta
 * em OUTRA rota. Pintar as duas rotas na mesma escala e o erro que faz alguem
 * filtrar "patrocinio ok" e descartar justamente o alvo de hoje.
 */
const SPONSORSHIP_GATE_CLASSNAMES: Record<SponsorshipGate, string> = {
  not_applicable: "text-beam-2",
  open: "text-ok",
  unknown: "text-ink-3",
  blocked: "text-destructive",
};

export const SPONSORSHIP_STYLES: StatusStyles = Object.fromEntries(
  SPONSORSHIP_SIGNALS.map((signal) => [
    signal,
    {
      label: SPONSORSHIP_LABELS[signal],
      className: SPONSORSHIP_GATE_CLASSNAMES[SPONSORSHIP_GATES[signal]],
    },
  ]),
);

export const SponsorshipBadge = makeStatusBadge(
  SPONSORSHIP_STYLES,
  "Sponsorship",
);

/* ── Application.source — src/lib/applications.ts ────────────────────────── */

const APPLICATION_SOURCE_CLASSNAMES: Record<ApplicationSource, string> = {
  vanhack: "text-ink",
  linkedin: "text-beam-2",
  company_site: "text-ink-3",
  indeed: "text-beam-2",
  glassdoor: "text-ok",
  recruiter: "text-warn",
  referral: "text-ok",
  radar: "text-beam-3",
  other: "text-ink-3",
};

export const APPLICATION_SOURCE_STYLES: StatusStyles = Object.fromEntries(
  APPLICATION_SOURCES.map((s) => [
    s,
    { label: SOURCE_LABELS[s], className: APPLICATION_SOURCE_CLASSNAMES[s] },
  ]),
);

export const ApplicationSourceBadge = makeStatusBadge(
  APPLICATION_SOURCE_STYLES,
  "ApplicationSource",
);

/* ── Project.status — src/lib/projects.ts ────────────────────────────────── */

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, StatusStyle> = {
  live: {
    label: "No ar",
    className: "text-ok",
  },
  internal: {
    label: "Interno",
    className: "text-beam-2",
  },
  nda: {
    label: "NDA",
    className: "text-warn",
  },
  archived: {
    label: "Arquivado",
    className: "text-ink-3",
  },
};

export const ProjectStatusBadge = makeStatusBadge(
  PROJECT_STATUS_STYLES,
  "ProjectStatus",
);

/* ── Project.category — src/lib/projects.ts ──────────────────────────────── */

export const PROJECT_CATEGORY_STYLES: Record<ProjectCategory, StatusStyle> = {
  web: {
    label: "Web",
    className: "text-beam-2",
  },
  mobile: {
    label: "Mobile",
    className: "text-ink",
  },
  ai: {
    label: "IA",
    className: "text-beam-3",
  },
  backend: {
    label: "Backend",
    className: "text-warn",
  },
  client: {
    label: "Cliente",
    className: "text-ok",
  },
};

export const ProjectCategoryBadge = makeStatusBadge(
  PROJECT_CATEGORY_STYLES,
  "ProjectCategory",
);

/* ── Project.sourceVisibility — public/private, the F1 partition ─────────── */

export const VISIBILITY_STYLES: StatusStyles = {
  public: {
    label: "Público",
    className: "text-ok",
  },
  private: {
    label: "Privado",
    className: "text-warn",
  },
};

export const VisibilityBadge = makeStatusBadge(VISIBILITY_STYLES, "Visibility");
