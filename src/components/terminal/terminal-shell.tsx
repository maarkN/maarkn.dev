"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { CommandMenu } from "./command-menu";
import { Output } from "./output";
import { Prompt, Ps1 } from "./prompt";
import { Screen } from "./screen";
import { StatusBar } from "./status-bar";
import s from "./terminal.module.css";
import type { OutputEntry, OutputLine, TerminalLabels } from "./types";

/** Class on `<html>` that stops the page from scrolling while the shell is up. */
const LOCK_CLASS = "terminal-lock";

/**
 * The terminal frame: status bar on top, command menu + scrollable screen
 * below, full viewport height. Owns the printed lines, the prompt value and
 * which menu items ran. Command execution itself arrives with the engine
 * (change 03); until then a requested command is only echoed at the prompt.
 */
export function TerminalShell({
  labels,
  motd,
  initialLines = [],
}: {
  labels: TerminalLabels;
  /** Server-rendered MOTD, placed above the output. */
  motd: ReactNode;
  initialLines?: OutputEntry[];
}) {
  const [lines, setLines] = useState<OutputEntry[]>(initialLines);
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLElement>(null);
  const nextId = useRef(initialLines.length);

  // Only the terminal route locks the document; inner pages keep scrolling.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(LOCK_CLASS);
    return () => root.classList.remove(LOCK_CLASS);
  }, []);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Keep the newest line in view.
  useEffect(() => {
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const focusPrompt = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const print = useCallback(
    (batch: OutputLine[], opts: { instant?: boolean; cmd?: boolean } = {}) => {
      const entries = batch.map<OutputEntry>((line, index) => ({
        id: nextId.current++,
        line,
        index,
        ...opts,
      }));
      setLines((prev) => [...prev, ...entries]);
    },
    [],
  );

  // Placeholder for the command engine: echo the line, remember the menu item.
  const requestCommand = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      if (cmd === "clear") {
        setLines([]);
        return;
      }
      print(
        [
          <>
            <Ps1 />
            {cmd}
          </>,
        ],
        { instant: true, cmd: true },
      );
      if (cmd) {
        setDone((prev) => (prev.has(cmd) ? prev : new Set(prev).add(cmd)));
      }
    },
    [print],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const submitted = value;
    setValue("");
    requestCommand(submitted);
  };

  return (
    <div className={s.term}>
      <StatusBar labels={labels.bar} onActivate={focusPrompt} />

      <div className={s.body}>
        <CommandMenu
          labels={labels.menu}
          done={done}
          onCommand={(name) => {
            requestCommand(name);
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
