"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { flushSync } from "react-dom";
import { logoutAction } from "@/app/_actions/auth";
import { listSearchableApplications } from "@/app/_actions/search";
import { controlClass, HoloButton } from "@/components/holo/button";
import { HoloDialog } from "@/components/holo/dialog";
import { HoloField } from "@/components/holo/field";
import { HoloFrame } from "@/components/holo/frame";
import { setSiteTheme } from "@/components/site-theme";
import type { AdminLocale } from "@/lib/admin/locale";
import { applicationResult, findResults, interfaceResults, type Result } from "@/lib/admin/search";
import { changeLanguage } from "./account-menu";
import type { ShellLabels } from "./labels";
import styles from "./shell.module.css";

export type SearchWindowProps = {
  open: boolean;
  onClose: () => void;
  locale: AdminLocale;
  labels: ShellLabels;
};

/**
 * The search. The focus stays in the field: the arrows walk the list, `Enter`
 * goes, `Esc` closes, and the number of results is announced.
 */
export function SearchWindow({ open, onClose, locale, labels }: SearchWindowProps) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  // After the window opened: it starts on its first control, the close button.
  useLayoutEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const choose = ({ target }: Result) => {
    // The window is gone, and has given the focus back, before anything moves it.
    flushSync(onClose);
    switch (target.type) {
      case "page":
        router.push(target.href);
        return;
      case "theme":
        setSiteTheme(target.theme);
        return;
      case "language":
        void changeLanguage(target.locale, labels.account.languageFailed);
        return;
      case "site":
        // Another document: the site has its own layout.
        window.location.assign("/");
        return;
      case "signOut":
        void logoutAction();
    }
  };

  return (
    <HoloDialog open={open} onClose={onClose} title={labels.search.title} closeLabel={labels.search.close} width={680}>
      <SearchBody input={input} locale={locale} labels={labels} onChoose={choose} />
    </HoloDialog>
  );
}

/** Mounted each time the window opens: it opens empty, and with the candidaturas of now. */
function SearchBody({
  input,
  locale,
  labels,
  onChoose,
}: {
  input: RefObject<HTMLInputElement | null>;
  locale: AdminLocale;
  labels: ShellLabels;
  onChoose: (result: Result) => void;
}) {
  const base = useId();
  const list = useRef<HTMLUListElement>(null);
  const [applications, setApplications] = useState<Result[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const { search } = labels;

  useEffect(() => {
    let current = true;
    listSearchableApplications().then(
      (result) => {
        if (!current) return;
        if (result.ok) setApplications((result.data ?? []).map(applicationResult));
        else setFailed(true);
      },
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  const always = useMemo(() => interfaceResults(labels, locale), [labels, locale]);
  const results = useMemo(
    () => findResults([...always, ...(applications ?? [])], query),
    [always, applications, query],
  );
  const current = results.at(Math.min(active, results.length - 1));
  const phrase = query.trim();

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [current?.id]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing || !current) return;
    const index = results.indexOf(current);
    if (event.key === "ArrowDown") setActive((index + 1) % results.length);
    else if (event.key === "ArrowUp") setActive((index - 1 + results.length) % results.length);
    else if (event.key === "Enter") onChoose(current);
    else return;
    event.preventDefault();
  };

  const status = () => {
    if (failed) return search.failed;
    // Nothing found yet is not nothing found: the candidaturas are still on the way.
    if (applications === null && phrase !== "") return search.loading;
    if (results.length === 0) return search.none.replace("{query}", phrase);
    if (results.length === 1) return search.count.one;
    return search.count.many.replace("{count}", String(results.length));
  };

  return (
    <div className={styles.searchBody}>
      <HoloField
        ref={input}
        label={search.label}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={results.length > 0}
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
          {search.retry}
        </HoloButton>
      )}

      <ul ref={list} id={`${base}-list`} role="listbox" aria-label={search.results} className={styles.results}>
        {results.map((result, index) => (
          <li
            key={result.id}
            id={`${base}-${result.id}`}
            role="option"
            aria-selected={result === current}
            data-holo=""
            data-result={result.id}
            className={controlClass({ className: styles.result })}
            onClick={() => onChoose(result)}
            onPointerMove={() => setActive(index)}
          >
            <HoloFrame seed={result.id} />
            <span className={styles.resultText}>
              <span>{result.title}</span>
              {result.detail && <small>{result.detail}</small>}
            </span>
            <span className={styles.resultKind}>{search.kinds[result.kind]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
