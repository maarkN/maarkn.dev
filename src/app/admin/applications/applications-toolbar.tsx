"use client";

/**
 * Filtros + paginação da lista de candidaturas.
 *
 * Um único client component é dono da URL (§4.2 do AGENTS.md): recebe os valores
 * já aplicados por prop (nada de `useSearchParams`) e escreve o próximo estado
 * com `router.push` dentro de uma transition.
 *
 * `position="top"` renderiza os filtros (draft → applied, SEM debounce);
 * `position="bottom"` renderiza só o `TablePager`. As duas instâncias
 * compartilham a mesma função de montagem da query string, então trocar de
 * página nunca perde um filtro e trocar de filtro sempre volta para a página 1.
 *
 * ── O filtro de patrocínio tem DOIS controles, de propósito ────────────────
 * A ROTA fica em destaque, fora do `<Select>`, como um par de botões sempre
 * visível — porque é a decisão que muda tudo o que vem depois:
 *
 *   • "Remota (B2B)" = `sponsorship = not_applicable_b2b`. É o foco atual:
 *     vaga remota pagando em moeda forte, contratada como contractor. O gate
 *     de visto **não se aplica**.
 *   • "Relocação" = todos os outros sinais. Aqui patrocínio é o critério
 *     eliminatório nº 1.
 *
 * Um único filtro "precisa de patrocínio?" — que é o que o tracker antigo
 * tinha, em forma de `sponsorsVisa Boolean` — descartaria justamente as vagas
 * que são o alvo de hoje. O `<Select>` de sinal continua existindo para
 * refinar DENTRO da rota (ex.: relocação + "não informa" = fila de verificação).
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { TablePager } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  FUNNEL_STAGE_LABELS,
  FUNNEL_STAGE_PHASES,
  SPONSORSHIP_HINTS,
  SPONSORSHIP_LABELS,
  SPONSORSHIP_ROUTE_HINTS,
  SPONSORSHIP_ROUTE_KEYS,
  SPONSORSHIP_ROUTE_LABELS,
  SPONSORSHIP_SIGNALS,
  sourceLabel,
} from "@/lib/applications";
import type { ApplicationFilters } from "@/lib/applications-query";
import { cn } from "@/lib/utils";

/** Sentinela: `<SelectItem value="">` é proibido pelo Radix. */
const ALL = "all";

interface ApplicationsToolbarProps extends ApplicationFilters {
  page: number;
  position: "top" | "bottom";
  /** Só em `position="top"`: valores distintos já presentes na base. */
  markets?: string[];
  sources?: string[];
  /** Só em `position="bottom"`: vêm da contagem feita no Server Component. */
  totalPages?: number;
  total?: number;
}

type Patch = Partial<ApplicationFilters> & { page?: number };

export function ApplicationsToolbar(props: ApplicationsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // "draft": o que está digitado/selecionado. Só vira URL no submit — exceto a
  // rota, que aplica no clique (é um botão, não um campo de formulário).
  const [draft, setDraft] = useState<ApplicationFilters>({
    q: props.q,
    stage: props.stage,
    phase: props.phase,
    market: props.market,
    route: props.route,
    sponsorship: props.sponsorship,
    source: props.source,
  });

  function push(patch: Patch) {
    const next = { ...draft, ...patch };
    const params = new URLSearchParams();
    for (const key of [
      "q",
      "stage",
      "phase",
      "market",
      "route",
      "sponsorship",
      "source",
    ] as const) {
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
    const empty: ApplicationFilters = {
      q: "",
      stage: "",
      phase: "",
      market: "",
      route: "",
      sponsorship: "",
      source: "",
    };
    setDraft(empty);
    push({ ...empty, page: 1 });
  }

  /** O `<Select>` de estágio carrega dois vocabulários numa lista só: fase
   * (grupo) e estágio exato. O prefixo mantém a URL com dois params limpos. */
  const stageValue = draft.stage
    ? `stage:${draft.stage}`
    : draft.phase
      ? `phase:${draft.phase}`
      : ALL;

  function onStageChange(value: string) {
    if (value === ALL) return setDraft((d) => ({ ...d, stage: "", phase: "" }));
    const [kind, key] = value.split(":");
    setDraft((d) =>
      kind === "phase"
        ? { ...d, phase: key, stage: "" }
        : { ...d, stage: key, phase: "" },
    );
  }

  return (
    <form
      className="space-y-3 pb-3"
      onSubmit={(event) => {
        event.preventDefault();
        push({});
      }}
    >
      {/* Rota — o critério que separa os dois planos. Aplica no clique. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Rota</span>
        <div className="inline-flex overflow-hidden rounded-md border border-border">
          <RouteButton
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
            <RouteButton
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft.q}
          onChange={(event) =>
            setDraft((d) => ({ ...d, q: event.target.value }))
          }
          placeholder="Empresa, vaga ou chave…"
          aria-label="Buscar por empresa, vaga ou chave natural"
          className="w-56"
        />

        <Select value={stageValue} onValueChange={onStageChange}>
          <SelectTrigger className="w-52" aria-label="Estágio do funil">
            <SelectValue placeholder="Estágio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os estágios</SelectItem>
            {FUNNEL_STAGE_PHASES.map((phase) => (
              <SelectGroup key={phase.key}>
                <SelectLabel>{phase.label}</SelectLabel>
                <SelectItem value={`phase:${phase.key}`}>
                  Todos de “{phase.label}”
                </SelectItem>
                {phase.stages.map((stage) => (
                  <SelectItem key={stage} value={`stage:${stage}`}>
                    {FUNNEL_STAGE_LABELS[stage]}
                  </SelectItem>
                ))}
              </SelectGroup>
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
          value={draft.source || ALL}
          onValueChange={(value) =>
            setDraft((d) => ({ ...d, source: value === ALL ? "" : value }))
          }
        >
          <SelectTrigger className="w-44" aria-label="Origem">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as origens</SelectItem>
            {withSelected(props.sources ?? [], draft.source).map((source) => (
              <SelectItem key={source} value={source}>
                {sourceLabel(source)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

function RouteButton({
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
 * placeholder em vez do valor corrente (ex.: última candidatura daquele mercado
 * excluída enquanto o filtro estava ativo).
 */
function withSelected(values: string[], selected: string): string[] {
  if (!selected || values.includes(selected)) return values;
  return [...values, selected].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
