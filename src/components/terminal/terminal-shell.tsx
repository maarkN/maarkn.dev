"use client";

import { useEffect, type ReactNode } from "react";
import type { Command, TerminalData } from "@/lib/terminal/types";
import { BootOverlay, hasFinePointer, useBoot } from "./boot-overlay";
import { CommandMenu } from "./command-menu";
import { Output } from "./output";
import { Prompt } from "./prompt";
import { Screen } from "./screen";
import { StatusBar } from "./status-bar";
import s from "./terminal.module.css";
import type { OutputEntry, TerminalLabels } from "./types";
import { useTerminal } from "./use-terminal";

/** Class on `<html>` that stops the page from scrolling while the shell is up. */
const LOCK_CLASS = "terminal-lock";

/**
 * The terminal frame: status bar on top, command menu + scrollable screen
 * below, full viewport height. All interaction (printing, history,
 * autocomplete, shortcuts, menu state) is handled by `useTerminal`. On the
 * first visit of a session a boot overlay covers the frame, which is already
 * in the DOM (server-rendered) underneath it.
 */
export function TerminalShell({
  labels,
  locale,
  motd,
  commands,
  files,
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
  /** Site content the content commands format (`ctx.data`). */
  data?: TerminalData;
  initialLines?: OutputEntry[];
}) {
  const boot = useBoot();
  const { lines, done, value, setValue, inputRef, screenRef, focusPrompt, run, handleKeyDown } =
    useTerminal({ labels, locale, commands, files, data, initialLines, onReboot: boot.reboot });

  // Only the terminal route locks the document; inner pages keep scrolling.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(LOCK_CLASS);
    return () => root.classList.remove(LOCK_CLASS);
  }, []);

  // Once the shell is usable, hand it the keyboard — but only where there is
  // a real one: focusing on a touch device would pop the virtual keyboard.
  useEffect(() => {
    if (!boot.interactive || !hasFinePointer()) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [boot.interactive, inputRef]);

  // While the boot lines are being typed the shell is neither read nor focusable.
  const covered = boot.status === "booting";

  return (
    <>
      <div className={s.term} aria-hidden={covered || undefined} inert={covered}>
        <StatusBar labels={labels.bar} onActivate={focusPrompt} />

        <div className={s.body}>
          <CommandMenu
            labels={labels.menu}
            done={done}
            onCommand={(name) => {
              run(name);
              focusPrompt();
            }}
          />

          <Screen ref={screenRef} onFocusRequest={focusPrompt}>
            {motd}
            <Output lines={lines} />
            <Prompt
              ref={inputRef}
              value={value}
              onChange={setValue}
              onKeyDown={handleKeyDown}
              label={labels.prompt.label}
            />
            <div className={s.hint}>{labels.hint}</div>
          </Screen>
        </div>
      </div>

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
