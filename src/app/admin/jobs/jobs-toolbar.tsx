"use client";

/**
 * Filtros + paginação do radar de vagas.
 *
 * Mesma receita da toolbar de candidaturas (§4.2 do `src/app/admin/AGENTS.md`):
 * um único client component é dono da URL, recebe o estado aplicado por prop
 * (nada de `useSearchParams`) e escreve o próximo com `router.push` dentro de
 * uma transition. `position="top"` = filtros (draft → applied, SEM debounce);
 * `position="bottom"` = só o `TablePager`.
 *
 * Dois controles ficam FORA do `<Select>`, como botões sempre visíveis, porque
 * são as duas decisões que mudam a leitura da tela inteira:
 *
 *   • ROTA — "Remota (B2B)" contra "Relocação". O gate de visto não é um
 *     booleano (ver o cabeçalho de `@/lib/applications`): um filtro único
 *     "precisa de patrocínio?" jogaria fora exatamente as vagas que são o alvo
 *     de hoje.
 *   • VÍNCULO — "Sem candidatura" transforma o radar numa fila de trabalho:
 *     é a pergunta que se faz ao abrir esta tela.
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { TablePager } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  SPONSORSHIP_HINTS,
  SPONSORSHIP_LABELS,
  SPONSORSHIP_ROUTE_HINTS,
  SPONSORSHIP_ROUTE_KEYS,
  SPONSORSHIP_ROUTE_LABELS,
  SPONSORSHIP_SIGNALS,
} from "@/lib/applications";
import { cn } from "@/lib/utils";
import type { JobFilters } from "./jobs-query";
import {
  JOB_LINK_HINTS,
  JOB_LINK_KEYS,
  JOB_LINK_LABELS,
  RADAR_NO_VERDICT,
  radarVerdictLabel,
} from "./radar";

/** Sentinela: `<SelectItem value="">` é proibido pelo Radix. */
const ALL = "all";

const FILTER_KEYS = [
  "q",
  "verdict",
  "market",
  "route",
  "sponsorship",
  "scoreMin",
  "scoreMax",
  "link",
] as const;

interface JobsToolbarProps extends JobFilters {
  page: number;
  position: "top" | "bottom";
  /** Só em `position="top"`: valores distintos já presentes na base. */
  markets?: string[];
  verdicts?: string[];
  /** Só em `position="bottom"`: vêm da contagem feita no Server Component. */
  totalPages?: number;
  total?: number;
}

type Patch = Partial<JobFilters> & { page?: number };

export function JobsToolbar(props: JobsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [draft, setDraft] = useState<JobFilters>({
    q: props.q,
    verdict: props.verdict,
    market: props.market,
    route: props.route,
    sponsorship: props.sponsorship,
    scoreMin: props.scoreMin,
    scoreMax: props.scoreMax,
    link: props.link,
  });

  function push(patch: Patch) {
    const next = { ...draft, ...patch };
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      if (next[key]) params.set(key, next[key]);
    }
    // Qualquer mudança de filtro volta para a primeira página.
    const page = patch.page ?? 1;
    if (page > 1) params.set("page", String(page));

    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  if (props.position === "bottom") {
    return (
      <TablePager
        page={props.page}
        totalPages={props.totalPages ?? 1}
        total={props.total}
        disabled={isPending}
        onPageChange={(page) => push({ page })}
      />
    );
  }

  const hasFilters = Object.values(draft).some(Boolean);

  function clear() {
    const empty: JobFilters = {
      q: "",
      verdict: "",
      market: "",
      route: "",
      sponsorship: "",
      scoreMin: "",
      scoreMax: "",
      link: "",
    };
    setDraft(empty);
    push({ ...empty, page: 1 });
  }

  return (
    <form
      className="space-y-3 pb-3"
      onSubmit={(event) => {
        event.preventDefault();
        push({});
      }}
    >
      {/* Rota + vínculo — aplicam no clique (são botões, não campos). */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Rota</span>
        <div className="inline-flex overflow-hidden rounded-none border border-border">
          <ToggleButton
            active={draft.route === ""}
            disabled={isPending}
            label="Todas"
            title="Sem filtro de rota: mostra remoto B2B e relocação juntos."
            onClick={() => {
              setDraft((d) => ({ ...d, route: "", sponsorship: "" }));
              push({ route: "", sponsorship: "" });
            }}
          />
          {SPONSORSHIP_ROUTE_KEYS.map((route) => (
            <ToggleButton
              key={route}
              active={draft.route === route}
              disabled={isPending}
              label={SPONSORSHIP_ROUTE_LABELS[route]}
              title={SPONSORSHIP_ROUTE_HINTS[route]}
              onClick={() => {
                // Trocar de rota zera o sinal: um sinal da outra rota deixaria
                // a lista vazia sem explicação.
                setDraft((d) => ({ ...d, route, sponsorship: "" }));
                push({ route, sponsorship: "" });
              }}
            />
          ))}
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <span className="text-xs font-medium text-muted-foreground">Funil</span>
        <div className="inline-flex overflow-hidden rounded-none border border-border">
          <ToggleButton
            active={draft.link === ""}
            disabled={isPending}
            label="Todas"
            title="Sem filtro: vagas com e sem candidatura."
            onClick={() => {
              setDraft((d) => ({ ...d, link: "" }));
              push({ link: "" });
            }}
          />
          {JOB_LINK_KEYS.map((link) => (
            <ToggleButton
              key={link}
              active={draft.link === link}
              disabled={isPending}
              label={JOB_LINK_LABELS[link]}
              title={JOB_LINK_HINTS[link]}
              onClick={() => {
                setDraft((d) => ({ ...d, link }));
                push({ link });
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Input
          value={draft.q}
          onChange={(event) => setDraft((d) => ({ ...d, q: event.target.value }))}
          placeholder="Vaga, empresa ou URL…"
          aria-label="Buscar por vaga, empresa ou URL"
          className="w-56"
        />

        <Select
          value={draft.verdict || ALL}
          onValueChange={(value) =>
            setDraft((d) => ({ ...d, verdict: value === ALL ? "" : value }))
          }
        >
          <SelectTrigger className="w-48" aria-label="Veredito do radar">
            <SelectValue placeholder="Veredito" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os vereditos</SelectItem>
            <SelectItem value={RADAR_NO_VERDICT}>Sem veredito</SelectItem>
            {withSelected(props.verdicts ?? [], draft.verdict)
              .filter((verdict) => verdict !== RADAR_NO_VERDICT)
              .map((verdict) => (
                <SelectItem key={verdict} value={verdict}>
                  {radarVerdictLabel(verdict)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select
          value={draft.market || ALL}
          onValueChange={(value) =>
            setDraft((d) => ({ ...d, market: value === ALL ? "" : value }))
          }
        >
          <SelectTrigger className="w-40" aria-label="Mercado">
            <SelectValue placeholder="Mercado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os mercados</SelectItem>
            {withSelected(props.markets ?? [], draft.market).map((market) => (
              <SelectItem key={market} value={market}>
                {market}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={draft.sponsorship || ALL}
          onValueChange={(value) =>
            setDraft((d) => ({ ...d, sponsorship: value === ALL ? "" : value }))
          }
        >
          <SelectTrigger className="w-64" aria-label="Sinal de patrocínio">
            <SelectValue placeholder="Sinal de patrocínio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Qualquer sinal</SelectItem>
            {SPONSORSHIP_SIGNALS.map((signal) => (
              <SelectItem
                key={signal}
                value={signal}
                title={SPONSORSHIP_HINTS[signal]}
              >
                {SPONSORSHIP_LABELS[signal]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-end gap-1">
          <div className="space-y-1">
            <Label htmlFor="score-min" className="text-xs text-muted-foreground">
              Pontuação
            </Label>
            <Input
              id="score-min"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={draft.scoreMin}
              onChange={(event) =>
                setDraft((d) => ({ ...d, scoreMin: event.target.value }))
              }
              placeholder="mín."
              aria-label="Pontuação mínima"
              className="w-20 tabular-nums"
            />
          </div>
          <span className="pb-2 text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={draft.scoreMax}
            onChange={(event) =>
              setDraft((d) => ({ ...d, scoreMax: event.target.value }))
            }
            placeholder="máx."
            aria-label="Pontuação máxima"
            className="w-20 tabular-nums"
          />
        </div>

        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          <Search className="size-4" />
          Filtrar
        </Button>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={isPending}
          >
            <X className="size-4" />
            Limpar
          </Button>
        )}
      </div>
    </form>
  );
}

function ToggleButton({
  active,
  disabled,
  label,
  title,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-none border-0 px-3",
        active && "bg-brand/15 text-brand hover:bg-brand/20",
      )}
    >
      {label}
    </Button>
  );
}

/**
 * O valor aplicado precisa existir entre as opções, senão o Radix mostra o
 * placeholder em vez do valor corrente (ex.: filtro por um veredito que sumiu
 * da base entre duas varreduras).
 */
function withSelected(values: string[], selected: string): string[] {
  if (!selected || values.includes(selected)) return values;
  return [...values, selected].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
