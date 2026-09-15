"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { anchorRedirect } from "@/lib/terminal/anchors";
import { rich } from "@/lib/terminal/rich";
import type { Fallback } from "@/lib/terminal/run";
import type { Command, TerminalData } from "@/lib/terminal/types";
import { BootOverlay, BootAnnouncement, hasFinePointer, useBoot } from "./boot-overlay";
import { CommandMenu } from "./command-menu";
import { DeepLink } from "./deep-link";
import { Output } from "./output";
import { AskPs1, Prompt, PROMPT_INPUT_ID } from "./prompt";
import { rememberRoute } from "./route-focus";
import { Screen } from "./screen";
import { StatusBar } from "./status-bar";
import s from "./terminal.module.css";
import type { OutputEntry, TerminalLabels } from "./types";
import { useTerminal } from "./use-terminal";

/**
 * The terminal frame: status bar on top, command menu + scrollable screen
 * below, full viewport height. All interaction (printing, history,
 * autocomplete, shortcuts, menu state) is handled by `useTerminal`. On the
 * first visit of a session a boot overlay covers the frame, which is already
 * in the DOM (server-rendered) underneath it. The document lock (screen
 * scrolls, page does not) is CSS, keyed on the `(terminal)` route group.
 */
export function TerminalShell({
  labels,
  locale,
  motd,
  commands,
  files,
  directories,
  fallback,
  data,
  initialLines,
}: {
  labels: TerminalLabels;
  locale: string;
  /** Server-rendered MOTD, placed above the output. */
  motd: ReactNode;
  /** Commands beyond the built-in system ones (content, AI, mail…). */
  commands?: Command[];
  /** File names `cat` accepts, for Tab completion. */
  files?: readonly string[];
  /** Directory names `cd` accepts, for Tab completion. */
  directories?: readonly string[];
  /** Reroutes input that matches no command (the `ask` fallback). */
  fallback?: Fallback;
  /** Site content the content commands format (`ctx.data`). */
  data?: TerminalData;
  initialLines?: OutputEntry[];
}) {
  const boot = useBoot();
  const {
    lines,
    done,
    active,
    value,
    setValue,
    ask,
    continuation,
    inputRef,
    screenRef,
    menuRef,
    skipRef,
    focusPrompt,
    run,
    runDeepLink,
    handleKeyDown,
  } = useTerminal({
    labels,
    locale,
    commands,
    files,
    directories,
    fallback,
    data,
    initialLines,
    onReboot: boot.reboot,
  });

  // Old `/#contact`-style links become `?cmd=contact` in place — on arrival
  // and on a later fragment change of this same document; the router picks
  // the change up and `DeepLink` runs it like any other deep-link. Deferred a
  // task: Next patches `history.replaceState` (so `useSearchParams` follows
  // it) in an effect of the app router, which runs after this one.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const convert = () => {
      const target = anchorRedirect(window.location.href);
      if (!target) return;
      clearTimeout(timer);
      timer = setTimeout(() => window.history.replaceState(null, "", target), 0);
    };
    convert();
    window.addEventListener("hashchange", convert);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", convert);
    };
  }, []);

  // Once the shell is usable, hand it the keyboard — but only where there is
  // a real one: focusing on a touch device would pop the virtual keyboard.
  useEffect(() => {
    if (!boot.interactive || !hasFinePointer()) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [boot.interactive, inputRef]);

  // So an inner page opened from here knows it was navigated to (focus → h1).
  const pathname = usePathname();
  useEffect(() => {
    rememberRoute(pathname);
  }, [pathname]);

  // While the boot lines are being typed the shell is neither read nor focusable.
  const covered = boot.status === "booting";

  return (
    <>
      <div className={s.term} aria-hidden={covered || undefined} inert={covered}>
        {/* First Tab stop: straight to the prompt (Tab would otherwise walk the bar and the menu). */}
        <a
          ref={skipRef}
          href={`#${PROMPT_INPUT_ID}`}
          className={s.skip}
          onClick={(event) => {
            event.preventDefault();
            focusPrompt();
          }}
        >
          {labels.a11y.skipToPrompt}
        </a>
        <StatusBar
          labels={labels.bar}
          locale={locale}
          onLang={() => run("lang")}
          onActivate={focusPrompt}
        />

        <div className={s.body}>
          <CommandMenu
            ref={menuRef}
            labels={labels.menu}
            done={done}
            active={active}
            onCommand={(name) => {
              run(name);
              focusPrompt();
            }}
          />

          <Screen ref={screenRef} onFocusRequest={focusPrompt}>
            {motd}
            <Output lines={lines} outputOf={labels.a11y.outputOf} />
            <Prompt
              ref={inputRef}
              value={value}
              onChange={setValue}
              onKeyDown={handleKeyDown}
              label={ask ? ask.label : labels.prompt.label}
              prefix={ask ? <AskPs1 label={ask.label} cont={continuation} /> : undefined}
              mask={ask?.options.mask}
              inputMode={ask?.options.inputMode}
              enterKeyHint={ask?.options.enterKeyHint}
            />
            <div className={s.hint}>
              {ask ? (ask.options.hint ?? labels.prompt.askHint) : rich(labels.hint)}
            </div>
          </Screen>
        </div>
      </div>

      <Suspense fallback={null}>
        <DeepLink ready={boot.interactive} onCommand={runDeepLink} />
      </Suspense>

      {/* Outside the (hidden, inert) shell and the remounting overlay. */}
      <BootAnnouncement status={boot.status} label={labels.boot.status} />
      {boot.status !== "done" && (
        <BootOverlay
          key={boot.run}
          lines={labels.boot.lines}
          skipLabel={labels.boot.skip}
          status={boot.status}
          onDone={boot.finish}
        />
      )}
    </>
  );
}
