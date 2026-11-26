"use client";

/**
 * The filters of the applications, for the list and for the board, and the
 * list's pager.
 *
 * One Client Component owns the URL (AGENTS.md §4.2): it receives the applied
 * values by prop (no `useSearchParams`) and writes the next state with
 * `router.push` inside a transition. What is typed or chosen is a draft until
 * "Filtrar", without a debounce. Any change of filter goes back to the first
 * page; changing page keeps every filter and the order.
 *
 * The parameters are the same on both screens (`q`, `stage`, `phase`, `route`,
 * `sponsorship`, `market`, `source`), so going from the list to the board keeps
 * the cut. The board has no `stage`: there the stage is the column, and the
 * lens is the phase.
 *
 * ── The visa has TWO controls, on purpose ──────────────────────────────────
 * The ROUTE first: remote (B2B/contractor), where the visa does not apply, and
 * relocation, where sponsorship decides. A single "needs sponsorship?" filter,
 * which is what the old tracker had, would throw away exactly the jobs that are
 * today's target. The signal refines inside the route.
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { FilterPanel } from "@/components/admin/filter-panel";
import { TablePager } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminDictionary } from "@/i18n/config";
import {
  FUNNEL_STAGE_PHASES,
  SPONSORSHIP_ROUTE_KEYS,
  SPONSORSHIP_SIGNALS,
  type ApplicationSource,
} from "@/lib/applications";
import type { ApplicationFilters } from "@/lib/applications-query";
import { fill } from "@/lib/admin/text";

/** Sentinel: `<SelectItem value="">` is forbidden by Radix. */
const ALL = "all";

const KEYS = ["q", "stage", "phase", "market", "route", "sponsorship", "source"] as const;

export type ApplicationsToolbarWords = {
  filters: AdminDictionary["applications"]["filters"];
  vocab: Pick<AdminDictionary["vocab"], "stage" | "phase" | "route" | "routeHint" | "visa" | "visaHint" | "source">;
  clear: string;
};

type Props = ApplicationFilters & {
  words?: ApplicationsToolbarWords;
  mode?: "list" | "board";
  page: number;
  position: "top" | "bottom";
  /** Only on top: the values already in the database. */
  markets?: string[];
  sources?: string[];
  /** Only at the bottom: from the count the Server Component made. */
  totalPages?: number;
  total?: number;
  /** The order of the list, kept when the page changes. */
  sort?: { key: string; dir: string };
};

export function ApplicationsToolbar(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<ApplicationFilters>({
    q: props.q,
    stage: props.stage,
    phase: props.phase,
    market: props.market,
    route: props.route,
    sponsorship: props.sponsorship,
    source: props.source,
  });

  function push(next: ApplicationFilters, page = 1) {
    const params = new URLSearchParams();
    for (const key of KEYS) if (next[key]) params.set(key, next[key]);
    if (props.sort) {
      params.set("sort", props.sort.key);
      params.set("dir", props.sort.dir);
    }
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  if (props.position === "bottom") {
    return (
      <TablePager
        page={props.page}
        totalPages={props.totalPages ?? 1}
        total={props.total}
        disabled={isPending}
        onPageChange={(page) => push(props, page)}
      />
    );
  }

  const { filters, vocab, clear } = props.words!;
  const board = props.mode === "board";
  const applied = KEYS.some((key) => props[key]);
  const set = (key: keyof ApplicationFilters) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: value === ALL ? "" : value }));

  /** Phase (a group) and exact stage share one select; the prefix keeps the URL with two clean parameters. */
  const stageValue = draft.stage ? `stage:${draft.stage}` : draft.phase ? `phase:${draft.phase}` : ALL;
  function onStageChange(value: string) {
    if (value === ALL) return setDraft((d) => ({ ...d, stage: "", phase: "" }));
    const [kind, key] = value.split(":");
    setDraft((d) => (kind === "phase" ? { ...d, phase: key, stage: "" } : { ...d, stage: key, phase: "" }));
  }

  return (
    <FilterPanel applied={KEYS.filter((key) => props[key]).length}>
      <form
        aria-label={filters.label}
        className="flex flex-wrap items-end gap-x-3 gap-y-4 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          push(draft);
        }}
      >
        <Field id="filter-q" label={filters.search} className="w-full sm:w-64">
          <Input
            id="filter-q"
            type="search"
            value={draft.q}
            onChange={(event) => setDraft((d) => ({ ...d, q: event.target.value }))}
            placeholder={filters.searchPlaceholder}
            className="w-full"
          />
        </Field>

        <Field id="filter-stage" label={board ? filters.phaseOnly : filters.phase} className="w-full sm:w-56">
          <Select value={stageValue} onValueChange={onStageChange}>
            <SelectTrigger id="filter-stage" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filters.allPhases}</SelectItem>
              {FUNNEL_STAGE_PHASES.map((phase) =>
                board ? (
                  <SelectItem key={phase.key} value={`phase:${phase.key}`}>
                    {vocab.phase[phase.key]}
                  </SelectItem>
                ) : (
                  <SelectGroup key={phase.key}>
                    <SelectLabel>{vocab.phase[phase.key]}</SelectLabel>
                    <SelectItem value={`phase:${phase.key}`}>{fill(filters.wholePhase, { phase: vocab.phase[phase.key] })}</SelectItem>
                    {phase.stages.map((stage) => (
                      <SelectItem key={stage} value={`stage:${stage}`}>
                        {vocab.stage[stage]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ),
              )}
            </SelectContent>
          </Select>
        </Field>

        <Field id="filter-route" label={filters.route} className="w-full sm:w-56">
          <Select
            value={draft.route || ALL}
            // Changing route clears the signal: a signal of the other route would
            // leave the list empty with no reason given.
            onValueChange={(value) => setDraft((d) => ({ ...d, route: value === ALL ? "" : value, sponsorship: "" }))}
          >
            <SelectTrigger id="filter-route" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filters.allRoutes}</SelectItem>
              {SPONSORSHIP_ROUTE_KEYS.map((route) => (
                <SelectItem key={route} value={route} title={vocab.routeHint[route]}>
                  {vocab.route[route]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="filter-visa" label={filters.visa} className="w-full sm:w-64">
          <Select value={draft.sponsorship || ALL} onValueChange={set("sponsorship")}>
            <SelectTrigger id="filter-visa" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filters.anyVisa}</SelectItem>
              {SPONSORSHIP_SIGNALS.map((signal) => (
                <SelectItem key={signal} value={signal} title={vocab.visaHint[signal]}>
                  {vocab.visa[signal]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="filter-market" label={filters.market} className="w-full sm:w-44">
          <Select value={draft.market || ALL} onValueChange={set("market")}>
            <SelectTrigger id="filter-market" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filters.allMarkets}</SelectItem>
              {withSelected(props.markets ?? [], draft.market).map((market) => (
                <SelectItem key={market} value={market}>
                  {market}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="filter-source" label={filters.source} className="w-full sm:w-48">
          <Select value={draft.source || ALL} onValueChange={set("source")}>
            <SelectTrigger id="filter-source" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filters.allSources}</SelectItem>
              {withSelected(props.sources ?? [], draft.source).map((source) => (
                <SelectItem key={source} value={source}>
                  {vocab.source[source as ApplicationSource] ?? source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2 pb-1">
          <Button type="submit" variant="outline" disabled={isPending}>
            <Search aria-hidden="true" />
            {filters.apply}
          </Button>
          {applied && (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                const empty = { q: "", stage: "", phase: "", market: "", route: "", sponsorship: "", source: "" };
                setDraft(empty);
                push(empty);
              }}
            >
              <X aria-hidden="true" />
              {clear}
            </Button>
          )}
        </div>
      </form>
    </FilterPanel>
  );
}

/** A filter with its visible label, which is its name. */
function Field({ id, label, className, children }: { id: string; label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="pb-1.5">
        {label}
      </Label>
      {children}
    </div>
  );
}

/**
 * The applied value has to be among the options, or Radix shows the
 * placeholder instead of it (the last application of that market deleted while
 * the filter was on, say).
 */
function withSelected(values: string[], selected: string): string[] {
  if (!selected || values.includes(selected)) return values;
  return [...values, selected].sort((a, b) => a.localeCompare(b));
}
