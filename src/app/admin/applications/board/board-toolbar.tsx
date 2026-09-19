"use client";

/**
 * Filtros do board.
 *
 * Mesma receita da toolbar da lista (AGENTS.md §4.2): um unico Client Component
 * e dono da URL, recebe os valores aplicados por prop (nada de
 * `useSearchParams`) e escreve o proximo estado com `router.push` dentro de uma
 * transition. Draft → applied, SEM debounce; a ROTA aplica no clique porque e
 * um botao, nao um campo de formulario.
 *
 * O vocabulario de parametro e IDENTICO ao da lista (`q`, `phase`, `market`,
 * `route`, `sponsorship`, `source`), entao trocar `/admin/applications` por
 * `/admin/applications/board` na mesma URL preserva o recorte. A unica excecao
 * e `stage`: no board o estagio E a coluna, filtrar por um deixaria o board com
 * uma coluna so. A lente equivalente aqui e a FASE.
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  FUNNEL_STAGE_PHASES,
  SPONSORSHIP_ROUTE_HINTS,
  SPONSORSHIP_ROUTE_KEYS,
  SPONSORSHIP_ROUTE_LABELS,
} from "@/lib/applications";
import type { ApplicationFilters } from "@/lib/applications-query";
import { cn } from "@/lib/utils";

/** Sentinela: `<SelectItem value="">` e proibido pelo Radix. */
const ALL = "all";

/** Os campos do board — `stage` fica fora (ver o cabecalho). */
type BoardFilters = Omit<ApplicationFilters, "stage">;

export interface BoardToolbarProps extends BoardFilters {
  /** Mercados distintos ja presentes na base. */
  markets: string[];
}

export function BoardToolbar(props: BoardToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [draft, setDraft] = useState<BoardFilters>({
    q: props.q,
    phase: props.phase,
    market: props.market,
    route: props.route,
    sponsorship: props.sponsorship,
    source: props.source,
  });

  function push(patch: Partial<BoardFilters>) {
    const next = { ...draft, ...patch };
    const params = new URLSearchParams();
    for (const key of [
      "q",
      "phase",
      "market",
      "route",
      "sponsorship",
      "source",
    ] as const) {
      if (next[key]) params.set(key, next[key]);
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  const hasFilters = Object.values(draft).some(Boolean);

  function clear() {
    const empty: BoardFilters = {
      q: "",
      phase: "",
      market: "",
      route: "",
      sponsorship: "",
      source: "",
    };
    setDraft(empty);
    push(empty);
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        push({});
      }}
    >
      {/* Rota — o criterio eliminatorio nº 1, fora do Select e aplicado no clique. */}
      <span className="text-xs font-medium text-muted-foreground">Rota</span>
      <div className="inline-flex overflow-hidden rounded-none border border-border">
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
              // Trocar de rota zera o sinal: um sinal da outra rota esvaziaria
              // o board sem explicacao.
              setDraft((d) => ({ ...d, route, sponsorship: "" }));
              push({ route, sponsorship: "" });
            }}
          />
        ))}
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

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
          {withSelected(props.markets, draft.market).map((market) => (
            <SelectItem key={market} value={market}>
              {market}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={draft.phase || ALL}
        onValueChange={(value) =>
          setDraft((d) => ({ ...d, phase: value === ALL ? "" : value }))
        }
      >
        <SelectTrigger className="w-44" aria-label="Fase do funil">
          <SelectValue placeholder="Fase" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Funil completo</SelectItem>
          {FUNNEL_STAGE_PHASES.map((phase) => (
            <SelectItem key={phase.key} value={phase.key}>
              Só “{phase.label}”
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={draft.q}
        onChange={(event) => setDraft((d) => ({ ...d, q: event.target.value }))}
        placeholder="Empresa, vaga ou chave…"
        aria-label="Buscar por empresa, vaga ou chave natural"
        className="w-56"
      />

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
 * O valor aplicado precisa existir entre as opcoes, senao o Radix mostra o
 * placeholder em vez do valor corrente.
 */
function withSelected(values: string[], selected: string): string[] {
  if (!selected || values.includes(selected)) return values;
  return [...values, selected].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
