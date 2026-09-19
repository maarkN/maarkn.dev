"use client";

/**
 * Search + pager for "Gerações recentes". One client component owns the URL
 * (AGENTS.md §4.2); the Server Component reads `searchParams` and paginates in
 * the database. Draft → applied on submit, no debounce.
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { TablePager } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  q: string;
  page: number;
  totalPages: number;
  total: number;
  position: "top" | "bottom";
}

export function GenerationsToolbar(p: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [draftQ, setDraftQ] = useState(p.q);

  function apply(next: { q?: string; page?: number }) {
    const params = new URLSearchParams();
    const q = next.q ?? draftQ;
    const page = next.page ?? 1;
    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  if (p.position === "bottom") {
    return (
      <TablePager
        page={p.page}
        totalPages={p.totalPages}
        total={p.total}
        disabled={isPending}
        onPageChange={(page) => apply({ page })}
      />
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2 pb-3"
      onSubmit={(e) => {
        e.preventDefault();
        apply({});
      }}
    >
      <Input
        value={draftQ}
        onChange={(e) => setDraftQ(e.target.value)}
        placeholder="Buscar por vaga ou empresa…"
        className="w-64"
        aria-label="Buscar por vaga ou empresa"
      />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        <Search className="size-4" />
        [ filtrar ]
      </Button>
    </form>
  );
}
