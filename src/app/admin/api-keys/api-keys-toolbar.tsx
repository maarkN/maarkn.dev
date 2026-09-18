"use client";

/**
 * Filtros + pager das chaves de API, num único client component (AGENTS.md
 * §4.2). Ele é o dono da URL: os valores atuais chegam por prop do Server
 * Component, então não há estado duplicado nem `useSearchParams`.
 *
 * Draft → applied, sem debounce: o que é digitado só vira URL no submit.
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
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
import { KEY_STATUS_STYLES } from "./key-status";

interface Props {
  q: string;
  status: string;
  page: number;
  totalPages: number;
  total: number;
  position: "top" | "bottom";
}

export function ApiKeysToolbar(p: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [draftQ, setDraftQ] = useState(p.q);
  const [draftStatus, setDraftStatus] = useState(p.status);

  function apply(next: { q?: string; status?: string; page?: number }) {
    const params = new URLSearchParams();
    const q = next.q ?? draftQ;
    const status = next.status ?? draftStatus;
    const page = next.page ?? 1; // trocar de filtro volta para a página 1
    if (q) params.set("q", q);
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
        placeholder="Buscar por nome ou prefixo…"
        className="w-56"
        aria-label="Buscar por nome ou prefixo"
      />
      {/* Radix proíbe <SelectItem value="">; "all" é a sentinela. */}
      <Select
        value={draftStatus || "all"}
        onValueChange={(v) => setDraftStatus(v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-44" aria-label="Situação">
          <SelectValue placeholder="Situação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as situações</SelectItem>
          {Object.entries(KEY_STATUS_STYLES).map(([value, style]) => (
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
    </form>
  );
}
