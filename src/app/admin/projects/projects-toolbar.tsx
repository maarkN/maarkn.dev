"use client";

/**
 * Filters + pager for `/admin/projects`. One client component owns the URL:
 * the URL is the query key (AGENTS.md §1), so both halves write to it.
 *
 * Filters are draft → applied (no debounce): typing only changes local state,
 * the submit pushes the new querystring.
 */

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import {
  PROJECT_CATEGORY_STYLES,
  PROJECT_STATUS_STYLES,
} from "@/components/admin/status-badge";
import { TablePager } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** `<SelectItem value="">` is forbidden by Radix — "all" is the sentinel. */
const ALL = "all";

interface Props {
  q: string;
  category: string;
  status: string;
  page: number;
  totalPages: number;
  total: number;
  position: "top" | "bottom";
}

export function ProjectsToolbar(p: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [draftQ, setDraftQ] = useState(p.q);
  const [draftCategory, setDraftCategory] = useState(p.category);
  const [draftStatus, setDraftStatus] = useState(p.status);

  function push(next: {
    q?: string;
    category?: string;
    status?: string;
    page?: number;
  }) {
    const params = new URLSearchParams();
    const q = next.q ?? draftQ;
    const category = next.category ?? draftCategory;
    const status = next.status ?? draftStatus;
    // Any filter change resets to page 1.
    const page = next.page ?? 1;
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
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
        onPageChange={(page) => push({ page })}
      />
    );
  }

  const hasFilters = Boolean(p.q || p.category || p.status);

  return (
    <form
      className="flex flex-wrap items-end gap-2 pb-3"
      onSubmit={(e) => {
        e.preventDefault();
        push({});
      }}
    >
      <Input
        value={draftQ}
        onChange={(e) => setDraftQ(e.target.value)}
        placeholder="Buscar por nome ou slug…"
        className="w-56"
        aria-label="Buscar projetos"
      />
      <Select
        value={draftCategory || ALL}
        onValueChange={(v) => setDraftCategory(v === ALL ? "" : v)}
      >
        <SelectTrigger className="w-44" aria-label="Categoria">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as categorias</SelectItem>
          {Object.entries(PROJECT_CATEGORY_STYLES).map(([value, style]) => (
            <SelectItem key={value} value={value}>
              {style.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={draftStatus || ALL}
        onValueChange={(v) => setDraftStatus(v === ALL ? "" : v)}
      >
        <SelectTrigger className="w-44" aria-label="Status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os status</SelectItem>
          {Object.entries(PROJECT_STATUS_STYLES).map(([value, style]) => (
            <SelectItem key={value} value={value}>
              {style.label}
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
          disabled={isPending}
          onClick={() => {
            setDraftQ("");
            setDraftCategory("");
            setDraftStatus("");
            push({ q: "", category: "", status: "", page: 1 });
          }}
        >
          <X className="size-4" />
          Limpar
        </Button>
      )}
    </form>
  );
}
