/**
 * Enum → coloured badge. One `Record<string, StatusStyle>` per enum, all built
 * through `makeStatusBadge`, so a new entity only needs a style map.
 *
 * Colour contract (admin de referência): `bg-<hue>-500/15 text-<hue>-700 dark:text-<hue>-400`.
 * The `dark:` variant is remapped in globals.css to `[data-theme="dark"]` and
 * `[data-theme="dev"]` — the admin <html> is always `data-theme="dark"`, so the
 * 400 shade is what actually renders in the backoffice.
 *
 * Unknown values never throw: they fall back to `<Badge variant="outline">`
 * with the raw key, which is what you want while an enum is still growing.
 */

import type { FunnelStage } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_SOURCES,
  FUNNEL_STAGES,
  FUNNEL_STAGE_LABELS,
  SOURCE_LABELS,
  SPONSORSHIP_GATES,
  SPONSORSHIP_LABELS,
  SPONSORSHIP_SIGNALS,
  type ApplicationSource,
  type SponsorshipGate,
} from "@/lib/applications";
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
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        —
      </Badge>
    );
  }
  const style = styles[status];
  if (!style) {
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    );
  }
  return (
    <Badge className={cn("border-transparent", style.className, className)}>
      {style.label}
    </Badge>
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
 * 21 estagios, 4 cores: a cor codifica a FASE (pre-envio, enviada, avaliacao,
 * desfecho), nao o estagio. Um matiz por estagio seria ilegivel numa tabela e
 * transformaria "que cor e essa?" numa consulta ao codigo — o rotulo ja diz o
 * estagio exato. Dentro do desfecho, os finais bons e ruins se separam.
 */
const FUNNEL_STAGE_CLASSNAMES: Record<FunnelStage, string> = {
  // pre-envio — cinza esfriando para ambar conforme a acao fica comigo
  radar: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  shortlisted: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  package_drafting: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  package_ready: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  awaiting_my_send: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ready: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  // enviada — azul
  applied: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  recruiter_contact: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  screening: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  // avaliacao — violeta
  assessment: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  technical_challenge: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  interview: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  final_interview: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  reference_check: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  // desfecho — verde para bom, vermelho para perdido, neutro para abandonado
  offer: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
  withdrawn: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300",
  no_response: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300",
  ghosted: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300",
  skipped: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300",
};

/** Rotulos vem de `src/lib/applications.ts` — nunca duplicados aqui. */
export const FUNNEL_STAGE_STYLES: StatusStyles = Object.fromEntries(
  FUNNEL_STAGES.map((stage) => [
    stage,
    {
      label: FUNNEL_STAGE_LABELS[stage],
      className: FUNNEL_STAGE_CLASSNAMES[stage],
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
  not_applicable: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  unknown: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  blocked: "bg-red-500/15 text-red-700 dark:text-red-400",
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
  vanhack: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  linkedin: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  company_site: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  indeed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  glassdoor: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  recruiter: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  referral: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  radar: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
  other: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300",
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
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  internal: {
    label: "Interno",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  nda: {
    label: "NDA",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  archived: {
    label: "Arquivado",
    className: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
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
    className: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  mobile: {
    label: "Mobile",
    className: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  ai: {
    label: "IA",
    className: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
  },
  backend: {
    label: "Backend",
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  },
  client: {
    label: "Cliente",
    className: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
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
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  private: {
    label: "Privado",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
};

export const VisibilityBadge = makeStatusBadge(VISIBILITY_STYLES, "Visibility");
