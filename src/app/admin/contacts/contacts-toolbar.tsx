"use client";

/**
 * Abas + filtros + paginação de `/admin/contacts`.
 *
 * Mesma receita das outras listas (§4.2 do `src/app/admin/AGENTS.md`): um único
 * client component é dono da URL, recebe o estado aplicado por prop e escreve o
 * próximo com `router.push` dentro de uma transition. Sem debounce.
 *
 * As abas são BOTÕES que escrevem `?tab=`, não o `<Tabs>` do Radix: o conteúdo
 * de cada aba é uma consulta paginada no servidor, então trocar de aba precisa
 * ser uma navegação — com estado de aba só no cliente, a paginação da outra aba
 * ficaria pendurada na mesma URL e o botão "voltar" do navegador não desfaria a
 * troca.
 */

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
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
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CompanyOption, ContactFilters } from "./contacts-query";
import {
  CONTACT_TABS,
  CONTACT_TAB_LABELS,
  channelLabel,
  type ContactsTab,
} from "./vocabulary";

/** Sentinela: `<SelectItem value="">` é proibido pelo Radix. */
const ALL = "all";

interface ContactsToolbarProps extends ContactFilters {
  page: number;
  position: "top" | "bottom";
  /** Só em `position="top"`. */
  channels?: string[];
  companies?: CompanyOption[];
  counts?: Record<ContactsTab, number>;
  /** Só em `position="bottom"`. */
  totalPages?: number;
  total?: number;
}

type Patch = Partial<ContactFilters> & { page?: number };

export function ContactsToolbar(props: ContactsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [draft, setDraft] = useState<ContactFilters>({
    tab: props.tab,
    q: props.q,
    channel: props.channel,
    company: props.company,
  });

  function push(patch: Patch) {
    const next = { ...draft, ...patch };
    const params = new URLSearchParams();
    // `contacts` é o default do parser — mantê-lo fora da URL deixa o link
    // canônico limpo.
    if (next.tab !== "contacts") params.set("tab", next.tab);
    if (next.q) params.set("q", next.q);
    // Canal e empresa só existem na aba de contatos.
    if (next.tab === "contacts") {
      if (next.channel) params.set("channel", next.channel);
      if (next.company) params.set("company", next.company);
    }
    const page = patch.page ?? 1;
    if (page > 1) params.set("page", String(page));

    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  if (props.position === "bottom") {
    return (
      <TablePager
        page={props.page}
        totalPages={props.totalPages ?? 1}
        total={props.total}
        disabled={isPending}
        onPageChange={(page) => push({ page })}
      />
    );
  }

  const isContacts = draft.tab === "contacts";
  const hasFilters = Boolean(draft.q || draft.channel || draft.company);

  function clear() {
    const empty = { q: "", channel: "", company: "" };
    setDraft((d) => ({ ...d, ...empty }));
    push({ ...empty, page: 1 });
  }

  return (
    <form
      className="space-y-3 pb-3"
      onSubmit={(event) => {
        event.preventDefault();
        push({});
      }}
    >
      <div className="inline-flex overflow-hidden rounded-none border border-border">
        {CONTACT_TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            aria-pressed={draft.tab === tab}
            onClick={() => {
              // Trocar de aba zera os filtros que não existem na outra.
              setDraft((d) => ({ ...d, tab, channel: "", company: "" }));
              push({ tab, channel: "", company: "" });
            }}
            className={cn(
              "rounded-none border-0 px-3",
              draft.tab === tab && "bg-brand/15 text-brand hover:bg-brand/20",
            )}
          >
            {CONTACT_TAB_LABELS[tab]}
            {props.counts && (
              <span className="pl-1 tabular-nums text-muted-foreground">
                {formatNumber(props.counts[tab])}
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft.q}
          onChange={(event) => setDraft((d) => ({ ...d, q: event.target.value }))}
          placeholder={
            isContacts ? "Nome, cargo, e-mail ou empresa…" : "Nome, empresa ou chave…"
          }
          aria-label="Buscar"
          className="w-64"
        />

        {isContacts && (
          <>
            <Select
              value={draft.channel || ALL}
              onValueChange={(value) =>
                setDraft((d) => ({ ...d, channel: value === ALL ? "" : value }))
              }
            >
              <SelectTrigger className="w-44" aria-label="Canal">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os canais</SelectItem>
                {withSelected(props.channels ?? [], draft.channel).map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channelLabel(channel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={draft.company || ALL}
              onValueChange={(value) =>
                setDraft((d) => ({ ...d, company: value === ALL ? "" : value }))
              }
            >
              <SelectTrigger className="w-56" aria-label="Empresa">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as empresas</SelectItem>
                {(props.companies ?? []).map((company) => (
                  <SelectItem key={company.folderName} value={company.folderName}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          <Search className="size-4" />
          [ filtrar ]
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
            [ limpar ]
          </Button>
        )}
      </div>
    </form>
  );
}

/**
 * O valor aplicado precisa existir entre as opções, senão o Radix mostra o
 * placeholder em vez do valor corrente (ex.: último contato daquele canal
 * excluído enquanto o filtro estava ativo).
 */
function withSelected(values: string[], selected: string): string[] {
  if (!selected || values.includes(selected)) return values;
  return [...values, selected].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
