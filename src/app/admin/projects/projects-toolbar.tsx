"use client";

/**
 * The filters of the projects, and their pager. The same recipe as the other
 * lists (AGENTS.md §4.2): one Client Component owns the URL and writes it on
 * "Filtrar"; any change of filter goes back to the first page, the order stays.
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { FilterPanel } from "@/components/admin/filter-panel";
import { TablePager } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminDictionary } from "@/i18n/config";
import { projectCategories, type ProjectStatus } from "@/lib/projects";

/** Sentinel: `<SelectItem value="">` is forbidden by Radix. */
const ALL = "all";
const STATUSES: ProjectStatus[] = ["live", "internal", "nda", "archived"];

type Filters = { q: string; category: string; status: string };

export type ProjectsToolbarWords = {
  filters: AdminDictionary["projects"]["filters"];
  vocab: Pick<AdminDictionary["vocab"], "projectCategory" | "projectStatus">;
  clear: string;
};

type Props = Filters & {
  words?: ProjectsToolbarWords;
  page: number;
  position: "top" | "bottom";
  totalPages?: number;
  total?: number;
  sort?: { key: string; dir: string };
};

export function ProjectsToolbar(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Filters>({ q: props.q, category: props.category, status: props.status });

  function push(next: Filters, page = 1) {
    const params = new URLSearchParams();
    for (const key of ["q", "category", "status"] as const) if (next[key]) params.set(key, next[key]);
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
  const applied = [props.q, props.category, props.status].filter(Boolean).length;

  return (
    <FilterPanel applied={applied}>
      <form
        aria-label={filters.label}
        className="flex flex-wrap items-end gap-x-3 gap-y-4 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          push(draft);
        }}
      >
        <div className="w-full sm:w-64">
          <Label htmlFor="projects-q" className="pb-1.5">
            {filters.search}
          </Label>
          <Input
            id="projects-q"
            type="search"
            value={draft.q}
            onChange={(event) => setDraft((d) => ({ ...d, q: event.target.value }))}
            placeholder={filters.searchPlaceholder}
            className="w-full"
          />
        </div>
        <div className="w-full sm:w-48">
          <Label htmlFor="projects-category" className="pb-1.5">
            {filters.category}
          </Label>
          <Select
            value={draft.category || ALL}
            onValueChange={(value) => setDraft((d) => ({ ...d, category: value === ALL ? "" : value }))}
          >
            <SelectTrigger id="projects-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filters.allCategories}</SelectItem>
              {projectCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {vocab.projectCategory[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Label htmlFor="projects-status" className="pb-1.5">
            {filters.status}
          </Label>
          <Select
            value={draft.status || ALL}
            onValueChange={(value) => setDraft((d) => ({ ...d, status: value === ALL ? "" : value }))}
          >
            <SelectTrigger id="projects-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filters.allStatuses}</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {vocab.projectStatus[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Button type="submit" variant="outline" disabled={isPending}>
            <Search aria-hidden="true" />
            {filters.apply}
          </Button>
          {applied > 0 && (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                const empty = { q: "", category: "", status: "" };
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
