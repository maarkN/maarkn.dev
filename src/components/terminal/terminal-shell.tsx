"use client";

import { useEffect, type ReactNode } from "react";
import type { Command, TerminalData } from "@/lib/terminal/types";
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
 * autocomplete, shortcuts, menu state) is handled by `useTerminal`.
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
  const { lines, done, value, setValue, inputRef, screenRef, focusPrompt, run, handleKeyDown } =
    useTerminal({ labels, locale, commands, files, data, initialLines });

  // Only the terminal route locks the document; inner pages keep scrolling.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(LOCK_CLASS);
    return () => root.classList.remove(LOCK_CLASS);
  }, []);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, [inputRef]);

  return (
    <div className={s.term}>
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
  );
}
