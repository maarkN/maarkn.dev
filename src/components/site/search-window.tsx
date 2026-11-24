"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { HoloButton, controlClass } from "@/components/holo/button";
import { HoloDialog } from "@/components/holo/dialog";
import { HoloField } from "@/components/holo/field";
import { HoloFrame } from "@/components/holo/frame";
import { setSiteTheme } from "@/components/site-theme";
import { search, type SearchItem } from "@/lib/site/search";
import { terminalHref } from "@/lib/terminal/address";
import { leaveQuestion } from "@/lib/terminal/handoff";
import { localizedHref, otherLocale, rememberLocale, type TerminalLocale } from "@/lib/terminal/locale";
import type { SiteLabels } from "./labels";
import styles from "./site.module.css";

type Labels = SiteLabels["search"];

export type SearchWindowProps = {
  open: boolean;
  onClose: () => void;
  locale: TerminalLocale;
  labels: Labels;
};

/** One request per language and visit; a failed one is forgotten, so it can be tried again. */
const indexes = new Map<string, Promise<SearchItem[]>>();

function loadIndex(locale: string): Promise<SearchItem[]> {
  const known = indexes.get(locale);
  if (known) return known;
  const loading = fetch(`/${locale}/search.json`).then((response) => {
    if (!response.ok) throw new Error(`search index: ${response.status}`);
    return response.json() as Promise<SearchItem[]>;
  });
  indexes.set(locale, loading);
  loading.catch(() => indexes.delete(locale));
  return loading;
}

/** What can be chosen: something found, or sending the phrase to the assistant. */
type Option = { id: string; item: SearchItem } | { id: string; ask: string };

/**
 * The search. The focus stays in the field: the arrows walk the list, `Enter`
 * goes, `Esc` closes, and the number of results is announced.
 */
export function SearchWindow({ open, onClose, locale, labels }: SearchWindowProps) {
  const router = useRouter();
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);

  // After the window opened: it starts on its first control, the close button.
  useLayoutEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const choose = (option: Option) => {
    onClose();
    if ("ask" in option) {
      leaveQuestion(option.ask);
      router.push(terminalHref(locale, "?cmd=ask"));
      return;
    }
    const { target } = option.item;
    switch (target.type) {
      case "theme":
        setSiteTheme(target.theme);
        return;
      case "language": {
        const next = otherLocale(locale);
        rememberLocale(next);
        // A document load, like the link in the top (links.tsx).
        window.location.assign(localizedHref(pathname, window.location.search, next));
        return;
      }
      case "file":
        window.open(target.href, "_blank", "noopener");
        return;
      default:
        // The home puts itself back where it was (home-scroll.tsx).
        router.push(target.href, { scroll: target.href !== `/${locale}` });
    }
  };

  return (
    <HoloDialog open={open} onClose={onClose} title={labels.title} closeLabel={labels.close} width={680}>
      <SearchBody input={input} locale={locale} labels={labels} onChoose={choose} />
    </HoloDialog>
  );
}

/** Mounted each time the window opens, so it always opens empty. */
function SearchBody({
  input,
  locale,
  labels,
  onChoose,
}: {
  input: RefObject<HTMLInputElement | null>;
  locale: TerminalLocale;
  labels: Labels;
  onChoose: (option: Option) => void;
}) {
  const base = useId();
  const list = useRef<HTMLUListElement>(null);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    let current = true;
    loadIndex(locale).then(
      (loaded) => current && setItems(loaded),
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [locale, attempt]);

  const phrase = query.trim();
  const found = useMemo(() => (items ? search(items, query) : []), [items, query]);
  const asking = items !== null && found.length === 0;
  const options: Option[] = asking
    ? [{ id: "ask", ask: phrase }]
    : found.map((item) => ({ id: item.id, item }));
  const current = options.at(Math.min(active, options.length - 1));

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [current?.id]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing || !current) return;
    const index = options.indexOf(current);
    if (event.key === "ArrowDown") setActive((index + 1) % options.length);
    else if (event.key === "ArrowUp") setActive((index - 1 + options.length) % options.length);
    else if (event.key === "Enter") onChoose(current);
    else return;
    event.preventDefault();
  };

  const status = () => {
    if (failed) return labels.failed;
    if (items === null) return labels.loading;
    if (asking) return labels.none.replace("{query}", phrase);
    if (found.length === 1) return labels.count.one;
    return labels.count.many.replace("{count}", String(found.length));
  };

  return (
    <div className={styles.searchBody}>
      <HoloField
        ref={input}
        label={labels.label}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={options.length > 0}
        aria-controls={`${base}-list`}
        aria-activedescendant={current && `${base}-${current.id}`}
        aria-autocomplete="list"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="go"
      />

      <p className={styles.searchStatus} role="status">
        {status()}
      </p>
      {failed && (
        <HoloButton
          size="sm"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
            input.current?.focus();
          }}
        >
          {labels.retry}
        </HoloButton>
      )}

      <ul ref={list} id={`${base}-list`} role="listbox" aria-label={labels.results} className={styles.results}>
        {options.map((option, index) => (
          <li
            key={option.id}
            id={`${base}-${option.id}`}
            role="option"
            aria-selected={option === current}
            data-holo=""
            data-result={option.id}
            className={controlClass({ className: styles.result })}
            onClick={() => onChoose(option)}
            onPointerMove={() => setActive(index)}
          >
            <HoloFrame seed={option.id} />
            {"ask" in option ? (
              <span className={styles.resultText}>{labels.ask.replace("{query}", option.ask)}</span>
            ) : (
              <>
                <span className={styles.resultText}>
                  <span lang={option.item.lang}>{option.item.title}</span>
                  {option.item.detail && <small>{option.item.detail}</small>}
                </span>
                <span className={styles.resultKind}>{labels.kinds[option.item.kind]}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
