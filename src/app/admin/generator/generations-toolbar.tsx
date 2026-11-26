"use client";

/**
 * The search of the recent generations, and their pager. One Client Component
 * owns the URL (AGENTS.md §4.2): the search is a draft until it is sent.
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { TablePager } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminDictionary } from "@/i18n/config";

type Props = {
  q: string;
  page: number;
  position: "top" | "bottom";
  words?: { filters: AdminDictionary["generator"]["recent"]["filters"]; clear: string };
  totalPages?: number;
  total?: number;
};

export function GenerationsToolbar(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(props.q);

  function push(q: string, page = 1) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  if (props.position === "bottom") {
    return (
      <TablePager
        page={props.page}
        totalPages={props.totalPages ?? 1}
        total={props.total}
        disabled={isPending}
        onPageChange={(page) => push(props.q, page)}
      />
    );
  }

  const { filters, clear } = props.words!;
  return (
    <form
      aria-label={filters.label}
      className="flex flex-wrap items-end gap-3 pb-2"
      onSubmit={(event) => {
        event.preventDefault();
        push(draft);
      }}
    >
      <div className="w-full sm:w-72">
        <Label htmlFor="generations-q" className="pb-1.5">
          {filters.search}
        </Label>
        <Input
          id="generations-q"
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={filters.searchPlaceholder}
          className="w-full"
        />
      </div>
      <div className="flex items-center gap-2 pb-1">
        <Button type="submit" variant="outline" disabled={isPending}>
          <Search aria-hidden="true" />
          {filters.apply}
        </Button>
        {props.q && (
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              setDraft("");
              push("");
            }}
          >
            <X aria-hidden="true" />
            {clear}
          </Button>
        )}
      </div>
    </form>
  );
}
