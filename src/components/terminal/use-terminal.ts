"use client";

import { useRouter } from "next/navigation";
import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useTheme } from "@/components/theme-provider";
import { complete } from "@/lib/terminal/complete";
import { createHistory } from "@/lib/terminal/history";
import { createRegistry, TERMINAL_ALIASES } from "@/lib/terminal/registry";
import { createRunner, type BaseContext, type RunnerIO } from "@/lib/terminal/run";
import {
  createSystemCommands,
  formatCandidates,
  formatFailed,
  formatNotFound,
} from "@/lib/terminal/system-commands";
import {
  EMPTY_TERMINAL_DATA,
  type Command,
  type OutputLine,
  type TerminalData,
} from "@/lib/terminal/types";
import { EchoLine } from "./prompt";
import type { OutputEntry, TerminalLabels } from "./types";

const NO_COMMANDS: Command[] = [];
const NO_FILES: string[] = [];
const NO_LINES: OutputEntry[] = [];

/** Line ids only need to be unique within a screen; a module counter is enough. */
let seq = 0;
const nextId = () => ++seq;

export type UseTerminalOptions = {
  labels: TerminalLabels;
  locale: string;
  /** Extra commands (content, AI, mail…), registered before the system ones. Memoize. */
  commands?: Command[];
  /** File names `cat` accepts, for Tab completion after `cat `. */
  files?: readonly string[];
  /** Site content for the content commands; empty when the host has none. */
  data?: TerminalData;
  initialLines?: OutputEntry[];
};

/**
 * Owns everything interactive in the shell: printed lines, the prompt value,
 * history, autocomplete, keyboard shortcuts and which menu items ran. The
 * engine itself lives in `lib/terminal`; this hook only adapts it to React.
 */
export function useTerminal({
  labels,
  locale,
  commands = NO_COMMANDS,
  files = NO_FILES,
  data = EMPTY_TERMINAL_DATA,
  initialLines = NO_LINES,
}: UseTerminalOptions) {
  // Re-keyed on the way in so every id on screen comes from the same counter.
  const [lines, setLines] = useState<OutputEntry[]>(() =>
    initialLines.map((entry) => ({ ...entry, id: nextId() })),
  );
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLElement>(null);
  const theme = useTheme();
  const router = useRouter();

  /* ── output ─────────────────────────────────────────────────── */

  const print = useCallback(
    (batch: OutputLine[], opts: { instant?: boolean; cmd?: boolean } = {}) => {
      const entries = batch.map<OutputEntry>((line, index) => ({
        id: nextId(),
        line,
        index,
        ...opts,
      }));
      setLines((prev) => [...prev, ...entries]);
    },
    [],
  );

  const replaceLast = useCallback((line: OutputLine) => {
    // Allocated outside the updater so it stays pure; unused ids are harmless.
    const id = nextId();
    setLines((prev) => {
      if (prev.length === 0) return [{ id, line, index: 0 }];
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, line }];
    });
  }, []);

  const echo = useCallback(
    (text: string) => print([createElement(EchoLine, { text })], { instant: true, cmd: true }),
    [print],
  );

  // Keep the newest line in view.
  useEffect(() => {
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const focusPrompt = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  /* ── engine ─────────────────────────────────────────────────── */

  const [history] = useState(() => createHistory());
  const [state] = useState<Record<string, unknown>>(() => ({}));

  const registry = useMemo(
    () => createRegistry([...commands, ...createSystemCommands(labels)], TERMINAL_ALIASES),
    [commands, labels],
  );

  const clearScreen = useCallback(() => setLines([]), []);

  const runner = useMemo(() => {
    const io: RunnerIO = {
      echo,
      print: (batch) => print(batch),
      printLine: (line) => print([line]),
      replaceLast,
      clear: clearScreen,
      markDone: (name) => {
        if (name === "clear" || name === "cls") return;
        setDone((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));
      },
    };
    return createRunner({
      registry,
      history,
      io,
      format: {
        notFound: (name, ctx) => formatNotFound(ctx.dict, name),
        failed: (name, error, ctx) => formatFailed(ctx.dict, name, error),
      },
    });
  }, [registry, history, echo, print, replaceLast, clearScreen]);

  // Abort whatever is still streaming when the shell unmounts.
  useEffect(() => () => runner.abort(), [runner]);

  // Built per call so a command sees the theme/dictionary of the moment it ran.
  const run = useCallback(
    (raw: string) => {
      const base: BaseContext = {
        locale,
        dict: labels,
        data,
        theme,
        navigate: (href) => router.push(href),
        openExternal: (url) => {
          try {
            window.open(url, "_blank", "noopener");
          } catch {
            /* popup blocked: the command prints the link anyway */
          }
        },
        // Boot sequence arrives in a later change; until then reboot only wipes.
        reboot: runner.clear,
        state,
      };
      void runner.run(raw, base);
    },
    [runner, locale, labels, data, theme, router, state],
  );

  /* ── keyboard ───────────────────────────────────────────────── */

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "Enter": {
        event.preventDefault();
        const submitted = value;
        setValue("");
        run(submitted);
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        const older = history.up();
        if (older !== null) setValue(older);
        return;
      }
      case "ArrowDown": {
        event.preventDefault();
        setValue(history.down());
        return;
      }
      case "Tab": {
        // Shift+Tab keeps moving focus backwards for keyboard users.
        if (event.shiftKey) return;
        event.preventDefault();
        const result = complete(value, registry.names(), files);
        if (result.kind === "replace") setValue(result.value);
        else if (result.kind === "list") {
          echo(value);
          print([formatCandidates(result.candidates)], { instant: true });
        }
        return;
      }
      case "l":
      case "L": {
        if (!event.ctrlKey) return;
        event.preventDefault();
        runner.clear();
        return;
      }
      case "c":
      case "C": {
        if (!event.ctrlKey) return;
        // Native copy wins when the visitor has text selected.
        if (window.getSelection()?.toString()) return;
        event.preventDefault();
        runner.abort();
        echo(`${value}^C`);
        setValue("");
        history.reset();
        return;
      }
      default:
    }
  };

  return {
    lines,
    done,
    value,
    setValue,
    inputRef,
    screenRef,
    focusPrompt,
    run,
    handleKeyDown,
  };
}
