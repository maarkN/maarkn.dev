"use client";

/**
 * Filtros + pager da auditoria do MCP, num único client component (AGENTS.md
 * §4.2). Dono da URL; os valores atuais chegam por prop do Server Component.
 *
 * Draft → applied, sem debounce.
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
import { AUDIT_STATUS_STYLES } from "./audit-status";

export interface KeyOption {
  id: string;
  name: string;
  keyPrefix: string;
}

interface Props {
  q: string;
  status: string;
  keyId: string;
  keys: KeyOption[];
  page: number;
  totalPages: number;
  total: number;
  position: "top" | "bottom";
}

export function AuditToolbar(p: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [draftQ, setDraftQ] = useState(p.q);
  const [draftStatus, setDraftStatus] = useState(p.status);
  const [draftKey, setDraftKey] = useState(p.keyId);

  function apply(next: {
    q?: string;
    status?: string;
    key?: string;
    page?: number;
  }) {
    const params = new URLSearchParams();
    const q = next.q ?? draftQ;
    const status = next.status ?? draftStatus;
    const key = next.key ?? draftKey;
    const page = next.page ?? 1; // trocar de filtro volta para a página 1
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (key) params.set("key", key);
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
        placeholder="Buscar por tool…"
        className="w-56"
        aria-label="Buscar por tool"
      />
      {/* Radix proíbe <SelectItem value="">; "all" é a sentinela. */}
      <Select
        value={draftStatus || "all"}
        onValueChange={(v) => setDraftStatus(v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-40" aria-label="Situação">
          <SelectValue placeholder="Situação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as situações</SelectItem>
          {Object.entries(AUDIT_STATUS_STYLES).map(([value, style]) => (
            <SelectItem key={value} value={value}>
              {style.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={draftKey || "all"}
        onValueChange={(v) => setDraftKey(v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-56" aria-label="Chave">
          <SelectValue placeholder="Chave" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as chaves</SelectItem>
          {/* Sentinela para as recusas que nunca chegaram a identificar a
              chave (header ausente, chave inexistente): elas têm apiKeyId
              nulo e sumiriam de qualquer filtro por chave. */}
          <SelectItem value="none">Sem chave identificada</SelectItem>
          {p.keys.map((k) => (
            <SelectItem key={k.id} value={k.id}>
              {k.name} ({k.keyPrefix}…)
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
