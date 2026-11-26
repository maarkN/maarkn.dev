"use client";

/**
 * The filters of the contacts, and their pager. The same recipe as the other
 * lists (AGENTS.md §4.2): one Client Component owns the URL and writes it on
 * "Filtrar". The tab is not here: it is a pair of links above, because each
 * tab is another list. Channel and company only exist on the contacts' tab.
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
import type { CompanyOption, ContactFilters } from "./contacts-query";
import { wordFor } from "./vocabulary";

/** Sentinel: `<SelectItem value="">` is forbidden by Radix. */
const ALL = "all";

export type ContactsToolbarWords = {
  filters: AdminDictionary["contacts"]["filters"];
  channel: AdminDictionary["vocab"]["channel"];
  clear: string;
};

type Props = ContactFilters & {
  words?: ContactsToolbarWords;
  page: number;
  position: "top" | "bottom";
  channels?: string[];
  companies?: CompanyOption[];
  totalPages?: number;
  total?: number;
};

export function ContactsToolbar(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ q: props.q, channel: props.channel, company: props.company });
  const isContacts = props.tab === "contacts";

  function push(next: { q: string; channel: string; company: string }, page = 1) {
    const params = new URLSearchParams();
    // `contacts` is the parser's default: out of the URL, the address stays clean.
    if (!isContacts) params.set("tab", props.tab);
    if (next.q) params.set("q", next.q);
    if (isContacts) {
      if (next.channel) params.set("channel", next.channel);
      if (next.company) params.set("company", next.company);
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

  const { filters, channel: channels, clear } = props.words!;
  const applied = [props.q, isContacts && props.channel, isContacts && props.company].filter(Boolean).length;

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
        <div className="w-full sm:w-72">
          <Label htmlFor="contacts-q" className="pb-1.5">
            {filters.search}
          </Label>
          <Input
            id="contacts-q"
            type="search"
            value={draft.q}
            onChange={(event) => setDraft((d) => ({ ...d, q: event.target.value }))}
            placeholder={isContacts ? filters.searchContacts : filters.searchReferences}
            className="w-full"
          />
        </div>

        {isContacts && (
          <>
            <div className="w-full sm:w-48">
              <Label htmlFor="contacts-channel" className="pb-1.5">
                {filters.channel}
              </Label>
              <Select
                value={draft.channel || ALL}
                onValueChange={(value) => setDraft((d) => ({ ...d, channel: value === ALL ? "" : value }))}
              >
                <SelectTrigger id="contacts-channel" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{filters.allChannels}</SelectItem>
                  {withSelected(props.channels ?? [], draft.channel).map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {wordFor(channels, channel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-60">
              <Label htmlFor="contacts-company" className="pb-1.5">
                {filters.company}
              </Label>
              <Select
                value={draft.company || ALL}
                onValueChange={(value) => setDraft((d) => ({ ...d, company: value === ALL ? "" : value }))}
              >
                <SelectTrigger id="contacts-company" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{filters.allCompanies}</SelectItem>
                  {(props.companies ?? []).map((company) => (
                    <SelectItem key={company.folderName} value={company.folderName}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

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
                const empty = { q: "", channel: "", company: "" };
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

/** The applied value has to be among the options, or Radix shows the placeholder. */
function withSelected(values: string[], selected: string): string[] {
  if (!selected || values.includes(selected)) return values;
  return [...values, selected].sort((a, b) => a.localeCompare(b));
}
