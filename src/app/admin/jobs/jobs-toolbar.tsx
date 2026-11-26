"use client";

/**
 * The filters of the jobs, and their pager. The same recipe as the
 * applications' (AGENTS.md §4.2): one Client Component owns the URL, receives
 * the applied values by prop, and writes the next state on "Filtrar". Any
 * change of filter goes back to the first page; the order is kept.
 *
 * The route comes before the signal, as on the applications: remote
 * (B2B/contractor), where the visa does not apply, and relocation, where
 * sponsorship decides.
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { FilterPanel } from "@/components/admin/filter-panel";
import { TablePager } from "@/components/admin/table-pager";
import { FieldHelp } from "@/components/admin/field-output";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminDictionary } from "@/i18n/config";
import { SPONSORSHIP_ROUTE_KEYS, SPONSORSHIP_SIGNALS } from "@/lib/applications";
import type { JobFilters } from "./jobs-query";
import { JOB_LINK_KEYS, RADAR_NO_VERDICT } from "./radar";

/** Sentinel: `<SelectItem value="">` is forbidden by Radix. */
const ALL = "all";

const KEYS = ["q", "verdict", "market", "route", "sponsorship", "scoreMin", "scoreMax", "link"] as const;
const EMPTY: JobFilters = { q: "", verdict: "", market: "", route: "", sponsorship: "", scoreMin: "", scoreMax: "", link: "" };

export type JobsToolbarWords = {
  filters: AdminDictionary["jobs"]["filters"];
  vocab: Pick<AdminDictionary["vocab"], "verdict" | "route" | "routeHint" | "visa" | "visaHint" | "link">;
  clear: string;
};

type Props = JobFilters & {
  words?: JobsToolbarWords;
  page: number;
  position: "top" | "bottom";
  markets?: string[];
  verdicts?: string[];
  totalPages?: number;
  total?: number;
  sort?: { key: string; dir: string };
};

export function JobsToolbar(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<JobFilters>(() => Object.fromEntries(KEYS.map((key) => [key, props[key]])) as JobFilters);

  function push(next: JobFilters, page = 1) {
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
  const applied = KEYS.some((key) => props[key]);
  const choose = (key: keyof JobFilters) => (value: string) => setDraft((d) => ({ ...d, [key]: value === ALL ? "" : value }));
  const verdictName = (verdict: string) => vocab.verdict[verdict as keyof typeof vocab.verdict] ?? verdict;

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
        <Field id="jobs-q" label={filters.search} className="w-full sm:w-64">
          <Input
            id="jobs-q"
            type="search"
            value={draft.q}
            onChange={(event) => setDraft((d) => ({ ...d, q: event.target.value }))}
            placeholder={filters.searchPlaceholder}
            className="w-full"
          />
        </Field>

        <Field id="jobs-verdict" label={filters.verdict} className="w-full sm:w-52">
          <Select value={draft.verdict || ALL} onValueChange={choose("verdict")}>
            <SelectTrigger id="jobs-verdict" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filters.allVerdicts}</SelectItem>
              <SelectItem value={RADAR_NO_VERDICT}>{vocab.verdict.none}</SelectItem>
              {withSelected(props.verdicts ?? [], draft.verdict)
                .filter((verdict) => verdict !== RADAR_NO_VERDICT)
                .map((verdict) => (
                  <SelectItem key={verdict} value={verdict}>
                    {verdictName(verdict)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="jobs-link" label={filters.link} className="w-full sm:w-48">
          <Select value={draft.link || ALL} onValueChange={choose("link")}>
            <SelectTrigger id="jobs-link" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filters.anyLink}</SelectItem>
              {JOB_LINK_KEYS.map((link) => (
                <SelectItem key={link} value={link}>
                  {vocab.link[link]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="jobs-route" label={filters.route} className="w-full sm:w-56">
          <Select
            value={draft.route || ALL}
            onValueChange={(value) => setDraft((d) => ({ ...d, route: value === ALL ? "" : value, sponsorship: "" }))}
          >
            <SelectTrigger id="jobs-route" className="w-full">
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

        <Field id="jobs-visa" label={filters.visa} className="w-full sm:w-64">
          <Select value={draft.sponsorship || ALL} onValueChange={choose("sponsorship")}>
            <SelectTrigger id="jobs-visa" className="w-full">
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

        <Field id="jobs-market" label={filters.market} className="w-full sm:w-44">
          <Select value={draft.market || ALL} onValueChange={choose("market")}>
            <SelectTrigger id="jobs-market" className="w-full">
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

        <fieldset className="flex items-end gap-2" aria-describedby="jobs-score-help">
          <legend className="sr-only">{`${filters.scoreMin} · ${filters.scoreMax}`}</legend>
          <Field id="jobs-score-min" label={filters.scoreMin} className="w-32">
            <Input
              id="jobs-score-min"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={draft.scoreMin}
              onChange={(event) => setDraft((d) => ({ ...d, scoreMin: event.target.value }))}
              className="w-full"
            />
          </Field>
          <Field id="jobs-score-max" label={filters.scoreMax} className="w-32">
            <Input
              id="jobs-score-max"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={draft.scoreMax}
              onChange={(event) => setDraft((d) => ({ ...d, scoreMax: event.target.value }))}
              className="w-full"
            />
          </Field>
          <FieldHelp id="jobs-score-help" className="pb-3">
            {filters.scoreHelp}
          </FieldHelp>
        </fieldset>

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
                setDraft(EMPTY);
                push(EMPTY);
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

/** The applied value has to be among the options, or Radix shows the placeholder. */
function withSelected(values: string[], selected: string): string[] {
  if (!selected || values.includes(selected)) return values;
  return [...values, selected].sort((a, b) => a.localeCompare(b));
}
