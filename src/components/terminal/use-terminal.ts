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
import { abortError } from "@/lib/terminal/abort";
import { resetConversation } from "@/lib/terminal/ask-command";
import { complete } from "@/lib/terminal/complete";
import { parseDeepLink } from "@/lib/terminal/deeplink";
import { createHistory, readStoredHistory } from "@/lib/terminal/history";
import { parse } from "@/lib/terminal/parse";
import { createRegistry, TERMINAL_ALIASES } from "@/lib/terminal/registry";
import {
  createRunner,
  type BaseContext,
  type Fallback,
  type RunnerIO,
  type RunOptions,
} from "@/lib/terminal/run";
import { discardSession, patchSession, readSession, recordCommand } from "@/lib/terminal/session";
import {
  createSystemCommands,
  formatCandidates,
  formatFailed,
  formatNotFound,
} from "@/lib/terminal/system-commands";
import {
  EMPTY_TERMINAL_DATA,
  type AskOptions,
  type Command,
  type OutputLine,
  type TerminalData,
} from "@/lib/terminal/types";
import { MENU_ITEMS } from "./command-menu";
import { AskEchoLine, EchoLine } from "./prompt";
import type { MenuItemName, OutputEntry, TerminalLabels } from "./types";

const NO_COMMANDS: Command[] = [];
const NO_FILES: string[] = [];
const NO_LINES: OutputEntry[] = [];

/** Line ids only need to be unique within a screen; a module counter is enough. */
let seq = 0;
const nextId = () => ++seq;

/**
 * Which command run is being printed: every line until the next echo belongs
 * to it, so the screen can group them as `output of <command>`. The label
 * starts as the typed text and becomes the resolved name once known.
 */
function createBlockTracker() {
  let active: { id: number; label: string } | null = null;
  return {
    start(text: string) {
      active = { id: nextId(), label: text.trim().split(/\s+/)[0] ?? "" };
    },
    relabel(name: string) {
      if (active) active.label = name;
    },
    get active() {
      return active;
    },
  };
}

/** Menu entries that show content; the last one run is the "current" item. */
const CONTENT_ITEMS = new Set<string>(
  MENU_ITEMS.map((item) => item.name).filter((name) => name !== "help" && name !== "clear"),
);

/** `a` ends with the whole of `b`. */
const endsWith = (a: readonly string[], b: readonly string[]) =>
  b.length > 0 && b.length <= a.length && b.every((line, i) => a[a.length - b.length + i] === line);

/** `href` is this very page, differing at most in query string or hash. */
const isSamePage = (href: string) =>
  new URL(href, window.location.href).pathname === window.location.pathname;

/**
 * A question a command is waiting on (`ctx.ask`). While one is pending the
 * prompt shows `→ label ` instead of the PS1, Enter answers it, `Esc`/`Ctrl+C`
 * cancel it, and history/autocomplete stay out of the way.
 */
export type PendingAsk = {
  label: string;
  options: AskOptions;
  answer: (text: string) => void;
  cancel: () => void;
};

export type UseTerminalOptions = {
  labels: TerminalLabels;
  locale: string;
  /** Extra commands (content, AI, mail…), registered before the system ones. Memoize. */
  commands?: Command[];
  /** File names `cat` accepts, for Tab completion after `cat `. */
  files?: readonly string[];
  /** Directory names `cd` accepts, for Tab completion after `cd `. */
  directories?: readonly string[];
  /** Reroutes input that matches no command (the `ask` fallback). Memoize. */
  fallback?: Fallback;
  /** Site content for the content commands; empty when the host has none. */
  data?: TerminalData;
  initialLines?: OutputEntry[];
  /** Runs after `reboot` wiped the screen; the host restarts the boot overlay. */
  onReboot?: () => void;
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
  directories = NO_FILES,
  fallback,
  data = EMPTY_TERMINAL_DATA,
  initialLines = NO_LINES,
  onReboot,
}: UseTerminalOptions) {
  // Re-keyed on the way in so every id on screen comes from the same counter.
  const [lines, setLines] = useState<OutputEntry[]>(() =>
    initialLines.map((entry) => ({ ...entry, id: nextId() })),
  );
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const [active, setActive] = useState<MenuItemName | null>(null);
  const [value, setValue] = useState("");
  const [ask, setAsk] = useState<PendingAsk | null>(null);
  /** Lines of a multi-line answer already entered with Shift+Enter. */
  const [draft, setDraft] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const skipRef = useRef<HTMLAnchorElement>(null);
  const theme = useTheme();
  const router = useRouter();

  /* ── output ─────────────────────────────────────────────────── */

  const [blocks] = useState(createBlockTracker);

  const print = useCallback(
    (batch: OutputLine[], opts: { instant?: boolean; cmd?: boolean } = {}) => {
      const group = blocks.active;
      const entries = batch.map<OutputEntry>((line, index) => ({
        id: nextId(),
        line,
        index,
        ...opts,
        ...(group ? { block: group.id, label: group.label } : {}),
      }));
      setLines((prev) => [...prev, ...entries]);
    },
    [blocks],
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
    (text: string) => {
      blocks.start(text);
      print([createElement(EchoLine, { text })], { instant: true, cmd: true });
    },
    [blocks, print],
  );

  /** The typed text resolved to a command: name the block after it. */
  const relabel = useCallback((name: string) => blocks.relabel(name), [blocks]);

  /** Echo one line of an answer (`→ label text`, or `… text` past the first). */
  const echoAnswer = useCallback(
    (pending: PendingAsk, text: string, cont: boolean) =>
      print(
        [createElement(AskEchoLine, { label: pending.label, text, cont, mask: pending.options.mask })],
        { instant: true },
      ),
    [print],
  );

  // Keep the newest line in view — except for the server-rendered opening
  // output, which the visitor reads from the top (MOTD first).
  const opening = useRef(lines);
  useEffect(() => {
    if (lines === opening.current) return;
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const focusPrompt = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  /** `Esc` on an empty prompt: Tab is autocomplete, so this is the way out. */
  const focusMenu = useCallback(() => {
    menuRef.current?.querySelector<HTMLElement>("button, a, [tabindex]")?.focus();
  }, []);

  /* ── engine ─────────────────────────────────────────────────── */

  // Picks up where the previous page of this tab left off (`↑` still works
  // after `open 1` and the browser's back button).
  const [history] = useState(() => createHistory({ initial: readStoredHistory() }));
  const [state] = useState<Record<string, unknown>>(() => ({}));

  const registry = useMemo(
    () => createRegistry([...commands, ...createSystemCommands(labels)], TERMINAL_ALIASES),
    [commands, labels],
  );

  // An empty screen has nothing to rebuild: the saved commands go with it,
  // and so does the `ask` conversation (spec: `clear` resets it).
  const clearScreen = useCallback(() => {
    setLines([]);
    setActive(null);
    discardSession();
    resetConversation(state);
  }, [state]);

  const runner = useMemo(() => {
    const io: RunnerIO = {
      echo,
      print: (batch, options) => print(batch, options),
      printLine: (line, options) => print([line], options),
      replaceLast,
      clear: clearScreen,
      markDone: (name) => {
        relabel(name);
        setActive(CONTENT_ITEMS.has(name) ? (name as MenuItemName) : null);
        if (name === "clear" || name === "cls") return;
        setDone((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));
      },
      // `ctx.ask`: the promise settles from the keyboard handler (Enter answers,
      // Esc/Ctrl+C cancel) or when the command itself is aborted.
      ask: (label, options, signal) =>
        new Promise<string>((resolve, reject) => {
          if (signal.aborted) {
            reject(abortError());
            return;
          }
          const finish = () => {
            signal.removeEventListener("abort", onAbort);
            setAsk(null);
            setDraft([]);
            setValue("");
          };
          const onAbort = () => {
            finish();
            reject(abortError());
          };
          signal.addEventListener("abort", onAbort, { once: true });
          setAsk({
            label,
            options,
            answer: (text) => {
              finish();
              resolve(text);
            },
            cancel: () => {
              finish();
              reject(abortError());
            },
          });
        }),
    };
    return createRunner({
      registry,
      history,
      io,
      format: {
        notFound: (name, ctx) => formatNotFound(ctx.dict, name),
        failed: (name, error, ctx) => formatFailed(ctx.dict, name, error),
      },
      fallback,
    });
  }, [registry, history, echo, relabel, print, replaceLast, clearScreen, fallback]);

  // Abort whatever is still streaming when the shell unmounts.
  useEffect(() => () => runner.abort(), [runner]);

  // Built per call so a command sees the theme/dictionary of the moment it ran.
  const baseContext = useCallback(
    (): BaseContext => ({
      locale,
      dict: labels,
      data,
      theme,
      navigate: (href) => {
        // `cd ~` from `/en?cmd=skills`: after a hard load Next keeps the
        // document's URL (query string included) as the canonical URL of the
        // route it seeded the cache with, so `router.push("/en")` resolves to
        // that entry and puts `?cmd=skills` back. The History API is wired
        // into the router (`useSearchParams` follows it) and has no such
        // cache, so a same-page move goes through it.
        if (isSamePage(href)) window.history.pushState(null, "", href);
        else router.push(href);
      },
      openExternal: (url) => {
        try {
          window.open(url, "_blank", "noopener");
        } catch {
          /* popup blocked: the command prints the link anyway */
        }
      },
      reboot: () => {
        runner.clear();
        onReboot?.();
      },
      state,
    }),
    [runner, locale, labels, data, theme, router, state, onReboot],
  );

  /**
   * What the visitor (or a deep-link) runs: recorded in the session so the
   * screen can be rebuilt after a navigation, then handed to the engine.
   */
  const execute = useCallback(
    (raw: string, options?: RunOptions) => {
      const parsed = parse(raw);
      if (parsed) recordCommand(raw.trim(), registry.resolve(parsed.name)?.name);
      return runner.run(raw, baseContext(), options);
    },
    [runner, registry, baseContext],
  );

  const run = useCallback(
    (raw: string) => {
      void execute(raw);
    },
    [execute],
  );

  /* ── session: rebuild the screen, then honour `?cmd=` ───────── */

  // Resolves with the lines replayed on mount (empty when there was nothing).
  const restored = useRef<Promise<string[]> | null>(null);
  // The replay runs outside any render: it reads the engine of the moment.
  const runnerRef = useRef(runner);
  const baseRef = useRef(baseContext);
  useEffect(() => {
    runnerRef.current = runner;
    baseRef.current = baseContext;
  }, [runner, baseContext]);

  // Replays the saved commands once, silently (no history, no animation).
  const ensureRestored = useCallback(() => {
    if (!restored.current) {
      restored.current = (async () => {
        const { lastCommands } = readSession();
        for (const line of lastCommands) {
          await runnerRef.current.run(line, baseRef.current(), { record: false, instant: true });
        }
        return lastCommands;
      })();
    }
    return restored.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Deferred a tick: React (dev) mounts, unmounts and mounts effects again,
    // and the unmount aborts whatever the runner is doing at that moment.
    queueMicrotask(() => {
      if (!cancelled) void ensureRestored();
    });
    return () => {
      cancelled = true;
    };
  }, [ensureRestored]);

  /**
   * `?cmd=` as the URL carries it. Sanitised against the registry and run
   * after the screen was rebuilt — unless the rebuilt screen already ends
   * with these very lines (the link that brought the visitor here, or the
   * `cd ..` of a listing they had already printed).
   */
  const runDeepLink = useCallback(
    (raw: string) => {
      const link = parseDeepLink(raw, (name) => registry.resolve(name) !== undefined);
      if (link.prefill !== undefined) setValue(link.prefill);
      if (link.run.length === 0) return;

      void (async () => {
        const replayed = await ensureRestored();
        const { cmd } = readSession();
        // Remembered whether it runs or not: the back button lands on this
        // same URL later and must find the link already consumed either way.
        patchSession({ cmd: raw });
        if (cmd === raw || endsWith(replayed, link.run)) return;
        for (const line of link.run) await execute(line, { instant: true });
      })();
    },
    [registry, execute, ensureRestored],
  );

  /* ── keyboard ───────────────────────────────────────────────── */

  /** Keys while a command is asking a question: answer, add a line or cancel. */
  const handleAskKeyDown = (pending: PendingAsk, event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "Enter": {
        event.preventDefault();
        const cont = draft.length > 0;
        echoAnswer(pending, value, cont);
        if (event.shiftKey && pending.options.multiline) {
          setDraft((prev) => [...prev, value]);
          setValue("");
          return;
        }
        // `answer` resets the prompt (value, draft, PS1) before resolving.
        pending.answer([...draft, value].join("\n"));
        return;
      }
      case "Escape": {
        event.preventDefault();
        pending.cancel();
        return;
      }
      case "c":
      case "C": {
        if (!event.ctrlKey) return;
        if (window.getSelection()?.toString()) return;
        event.preventDefault();
        pending.cancel();
        return;
      }
      case "l":
      case "L": {
        // Wiping the screen aborts the command, which rejects the question.
        if (!event.ctrlKey) return;
        event.preventDefault();
        runner.clear();
        return;
      }
      case "ArrowUp":
      case "ArrowDown":
        // No history while answering: the answers are not part of it either.
        event.preventDefault();
        return;
      default:
      // Tab is not autocomplete here; it moves focus as anywhere else.
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (ask) {
      handleAskKeyDown(ask, event);
      return;
    }
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
      case "Escape": {
        // Like a shell: a typed line is discarded. An empty one hands the
        // keyboard to the menu, since Tab is taken by autocomplete.
        event.preventDefault();
        if (value) {
          setValue("");
          history.reset();
        } else {
          focusMenu();
        }
        return;
      }
      case "Tab": {
        // Shift+Tab keeps moving focus backwards for keyboard users.
        if (event.shiftKey) return;
        event.preventDefault();
        // Nothing to complete: Tab is a Tab, and the prompt is the last stop
        // of the page, so the focus wraps to the first one (the skip link).
        // The prompt is focused on load, which keeps "first Tab → skip link" true.
        if (!value.trim()) {
          skipRef.current?.focus();
          return;
        }
        const result = complete(value, registry.names(), files, directories);
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
    active,
    value,
    setValue,
    /** The question being asked, if any; `draft` tells whether it is on a continuation line. */
    ask,
    continuation: draft.length > 0,
    inputRef,
    screenRef,
    menuRef,
    skipRef,
    focusPrompt,
    run,
    runDeepLink,
    handleKeyDown,
  };
}
