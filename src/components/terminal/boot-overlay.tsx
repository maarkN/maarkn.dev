"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import s from "./terminal.module.css";

/*
 * Boot sequence — ported from .docs/design/maarkn-terminal.html (`boot()`).
 * Six lines typed character by character over a full-screen overlay, then a
 * fade to the shell that was sitting underneath all along. `useBoot` decides
 * whether the sequence runs at all (once per browser session, never under
 * reduced motion) and `BootOverlay` performs it.
 */

/** `sessionStorage` flag: the visitor already saw (or skipped) the boot. */
export const BOOT_KEY = "maarkn-booted";

const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";
const FINE_POINTER = "(pointer: fine)";

/* Timings. The mockup types at 16–40ms/char, which lands the six lines at
   ~5.5s — over the 3–5s budget the spec sets — so the per-character delay is
   trimmed a little; every other pause is the mockup's. */
const CHAR_MIN_MS = 12;
const CHAR_JITTER_MS = 14;
const SPACE_MS = 10;
const OK_PAUSE_MS = 240;
const LINE_PAUSE_MS = 120;
const HOLD_MS = 380;
/** After a skip the full text is shown only briefly before the fade. */
const SKIP_HOLD_MS = 150;
/** Must match `transition` on `.boot` in terminal.module.css. */
export const FADE_MS = 450;

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "AltGraph", "CapsLock", "OS"]);

/* ── environment helpers (client only, all failure-tolerant) ───── */

const media = (query: string): boolean =>
  typeof matchMedia === "function" && matchMedia(query).matches;

export const prefersReducedMotion = () => media(REDUCE_MOTION);
export const hasFinePointer = () => media(FINE_POINTER);

const readBooted = () => {
  try {
    return sessionStorage.getItem(BOOT_KEY) === "1";
  } catch {
    return false;
  }
};
const writeBooted = () => {
  try {
    sessionStorage.setItem(BOOT_KEY, "1");
  } catch {
    /* no storage: the boot simply runs again next load */
  }
};
const clearBooted = () => {
  try {
    sessionStorage.removeItem(BOOT_KEY);
  } catch {}
};

/* ── session state ─────────────────────────────────────────────── */

/**
 * `pending`: server render and first client frame — nothing decided yet, the
 * overlay covers the shell but shows no text. `booting`: typing. `fading`:
 * the shell is usable while the overlay fades out. `done`: no overlay.
 */
export type BootStatus = "pending" | "booting" | "fading" | "done";

export function useBoot() {
  const [status, setStatus] = useState<BootStatus>("pending");
  // Bumped by `reboot` so the overlay remounts and starts from scratch.
  const [run, setRun] = useState(0);

  // Reads storage/media after hydration; the SSR markup stays neutral.
  useEffect(() => {
    if (readBooted()) {
      setStatus("done");
      return;
    }
    if (prefersReducedMotion()) {
      writeBooted();
      setStatus("done");
      return;
    }
    setStatus("booting");
  }, []);

  const finish = useCallback(() => {
    writeBooted();
    setStatus("fading");
  }, []);

  useEffect(() => {
    if (status !== "fading") return;
    const timer = setTimeout(() => setStatus("done"), FADE_MS + 50);
    return () => clearTimeout(timer);
  }, [status]);

  const reboot = useCallback(() => {
    // Reduced motion omits the boot entirely; `reboot` then only wipes.
    if (prefersReducedMotion()) return;
    clearBooted();
    setRun((n) => n + 1);
    setStatus("booting");
  }, []);

  return {
    status,
    run,
    /** The shell can be read and typed into. */
    interactive: status === "fading" || status === "done",
    finish,
    reboot,
  };
}

/* ── announcement ──────────────────────────────────────────────── */

/**
 * The one sentence assistive tech hears for the whole boot. A live region
 * only announces what changes after it exists, so the region is always
 * rendered (server included) and the sentence is written into it when the
 * typing starts (`pending` → `booting`, and again on every `reboot`) and
 * removed once it ends — removals are not announced.
 */
export function BootAnnouncement({ status, label }: { status: BootStatus; label: string }) {
  return (
    <p className="sr-only" role="status">
      {status === "booting" ? label : ""}
    </p>
  );
}

/* ── overlay ───────────────────────────────────────────────────── */

/** `[ok]` in green, by splitting the string — never through innerHTML. */
function Painted({ text }: { text: string }) {
  const at = text.indexOf("[ok]");
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className={s.g}>[ok]</span>
      {text.slice(at + 4)}
    </>
  );
}

export function BootOverlay({
  lines,
  skipLabel,
  status,
  onDone,
}: {
  lines: readonly string[];
  skipLabel: string;
  status: BootStatus;
  /** Typing (or skip) finished: the shell may take over while we fade. */
  onDone: () => void;
}) {
  // What is on screen: complete lines plus the one being typed. Assistive
  // tech hears none of it: the single announcement is `BootAnnouncement` in the
  // shell, which outlives this overlay (it is remounted by `reboot`).
  const [shown, setShown] = useState<string[]>([]);
  // Kept in a ref so a new callback identity never restarts the typing.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (status !== "booting") return;

    // `skip` fires on the first key/tap; `cancelled` on unmount.
    const skip = new AbortController();
    let cancelled = false;
    const onKey = (event: KeyboardEvent) => {
      if (MODIFIER_KEYS.has(event.key)) return;
      skip.abort();
    };
    // Installed on the next task: React flushes this effect synchronously
    // inside the discrete event that mounted the overlay (the Enter that
    // ran `reboot`), and that event is still bubbling towards `window` —
    // listeners added now would take it as the key that skips the boot.
    const install = setTimeout(() => {
      if (skip.signal.aborted) return;
      window.addEventListener("keydown", onKey, { signal: skip.signal });
      window.addEventListener("pointerdown", () => skip.abort(), { signal: skip.signal });
    }, 0);

    // Resolves after `ms`, or at once when the visitor skips.
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        if (skip.signal.aborted) return resolve();
        const timer = setTimeout(done, ms);
        function done() {
          clearTimeout(timer);
          skip.signal.removeEventListener("abort", done);
          resolve();
        }
        skip.signal.addEventListener("abort", done, { once: true });
      });
    const skipped = () => skip.signal.aborted;

    (async () => {
      for (let i = 0; i < lines.length && !skipped(); i++) {
        const line = lines[i];
        let text = "";
        for (const ch of line) {
          if (skipped() || cancelled) break;
          text += ch;
          const snapshot = text;
          setShown((prev) => {
            const next = prev.slice(0, i);
            next[i] = snapshot;
            return next;
          });
          await wait(ch === " " ? SPACE_MS : CHAR_MIN_MS + Math.random() * CHAR_JITTER_MS);
        }
        if (skipped() || cancelled) break;
        await wait(line.endsWith("[ok]") ? OK_PAUSE_MS : LINE_PAUSE_MS);
      }
      if (cancelled) return;

      const wasSkipped = skipped();
      setShown([...lines]);
      skip.abort();
      await new Promise((r) => setTimeout(r, wasSkipped ? SKIP_HOLD_MS : HOLD_MS));
      if (!cancelled) onDoneRef.current();
    })();

    return () => {
      cancelled = true;
      clearTimeout(install);
      skip.abort();
    };
  }, [status, lines]);

  return (
    <div
      className={clsx(s.boot, status === "pending" && s.bootPending, status === "fading" && s.bootGone)}
      data-boot=""
    >
      {/* Without JavaScript nothing would ever lift the overlay: hide it. */}
      <noscript>
        <style>{"[data-boot]{display:none}"}</style>
      </noscript>
      {/* The typed lines are visual only (see `BootAnnouncement`). */}
      <pre className={s.bootLines} aria-hidden="true">
        {shown.map((text, i) => (
          <div key={i}>{text === lines[i] ? <Painted text={text} /> : text}</div>
        ))}
      </pre>
      <div className={s.bootSkip} aria-hidden="true">
        {skipLabel}
      </div>
    </div>
  );
}
