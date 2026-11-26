"use client";

/**
 * The filters of a simple list (a search and a few selects) and its pager, for
 * the screens whose filters are only that. The recipe of AGENTS.md §4.2: one
 * Client Component owns the URL, receives the applied values by prop, and
 * writes them on "Filtrar"; any change of filter goes back to the first page.
 * Every field has its visible label, which is its name.
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FilterPanel } from "./filter-panel";
import { TablePager } from "./table-pager";

/** Sentinel: `<SelectItem value="">` is forbidden by Radix. */
const ALL = "all";

export type ListFilterField = { name: string; label: string; className?: string } & (
  | { kind: "search"; placeholder: string }
  | { kind: "select"; all: string; options: { value: string; label: string }[] }
);

type Props = {
  values: Record<string, string>;
  page: number;
  position: "top" | "bottom";
  fields?: ListFilterField[];
  words?: { label: string; apply: string; clear: string };
  totalPages?: number;
  total?: number;
};

export function ListFilters(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(props.values);

  function push(next: Record<string, string>, page = 1) {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(next)) if (value) params.set(name, value);
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
        onPageChange={(page) => push(props.values, page)}
      />
    );
  }

  const fields = props.fields ?? [];
  const words = props.words!;
  const applied = Object.values(props.values).filter(Boolean).length;
  const id = (name: string) => `filter-${name}`;

  return (
    <FilterPanel applied={applied}>
      <form
        aria-label={words.label}
        className="flex flex-wrap items-end gap-x-3 gap-y-4 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          push(draft);
        }}
      >
        {fields.map((field) => (
          <div key={field.name} className={cn("w-full", field.className ?? (field.kind === "search" ? "sm:w-64" : "sm:w-52"))}>
            <Label htmlFor={id(field.name)} className="pb-1.5">
              {field.label}
            </Label>
            {field.kind === "search" ? (
              <Input
                id={id(field.name)}
                type="search"
                value={draft[field.name] ?? ""}
                onChange={(event) => setDraft((d) => ({ ...d, [field.name]: event.target.value }))}
                placeholder={field.placeholder}
                className="w-full"
              />
            ) : (
              <Select
                value={draft[field.name] || ALL}
                onValueChange={(value) => setDraft((d) => ({ ...d, [field.name]: value === ALL ? "" : value }))}
              >
                <SelectTrigger id={id(field.name)} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{field.all}</SelectItem>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 pb-1">
          <Button type="submit" variant="outline" disabled={isPending}>
            <Search aria-hidden="true" />
            {words.apply}
          </Button>
          {applied > 0 && (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                const empty = Object.fromEntries(Object.keys(props.values).map((key) => [key, ""]));
                setDraft(empty);
                push(empty);
              }}
            >
              <X aria-hidden="true" />
              {words.clear}
            </Button>
          )}
        </div>
      </form>
    </FilterPanel>
  );
}
