"use client";

import { useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { clsx } from "clsx";
import { site } from "@/lib/site";
import s from "./terminal.module.css";

export const PROMPT_USER = `${site.nick}@dev`;
/** `id` of the command input — the skip link's target. One prompt per page. */
export const PROMPT_INPUT_ID = "cmd";

/**
 * `maarkn@dev:~$ ` — used by the prompt and by echoed command lines.
 *
 * `cwd` exists for the backoffice chrome, whose commands are written relative
 * to `~/admin` (`ls applications/`); on the public site it is always `~`.
 */
export function Ps1({ cwd = "~" }: { cwd?: string } = {}) {
  return (
    <span className={s.ps1}>
      <span className={s.u}>{PROMPT_USER}</span>:<span className={s.h}>{cwd}</span>${" "}
    </span>
  );
}

/** An echoed command line: PS1 followed by the text, verbatim. */
export function EchoLine({ text }: { text: string }) {
  return (
    <>
      <Ps1 />
      {text}
    </>
  );
}

/**
 * The prompt of an interactive question (`ctx.ask`): `→ name: `, or the
 * `… ` continuation of a multi-line answer.
 */
export function AskPs1({ label, cont = false }: { label: string; cont?: boolean }) {
  return (
    <span className={clsx(s.ps1, s.ask)}>
      {cont ? (
        <span className={s.d}>… </span>
      ) : (
        <>
          <span className={s.p}>→</span> {label}{" "}
        </>
      )}
    </span>
  );
}

/** An echoed answer line. Masked answers echo as bullets. */
export function AskEchoLine({
  label,
  text,
  cont,
  mask,
}: {
  label: string;
  text: string;
  cont?: boolean;
  mask?: boolean;
}) {
  return (
    <>
      <AskPs1 label={label} cont={cont} />
      {mask ? "•".repeat(text.length) : text}
    </>
  );
}

export function Prompt({
  value,
  onChange,
  onKeyDown,
  label,
  ref,
  prefix,
  mask = false,
  inputMode = "text",
  enterKeyHint = "go",
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** Accessible name of the (visually hidden) input. */
  label: string;
  ref?: Ref<HTMLInputElement>;
  /** What precedes the typed text; the PS1 unless a question is being asked. */
  prefix?: ReactNode;
  /** Show the typed text as bullets (`ctx.ask` with `mask`). */
  mask?: boolean;
  inputMode?: "text" | "email";
  enterKeyHint?: "go" | "next" | "send";
}) {
  const id = PROMPT_INPUT_ID;
  const [focused, setFocused] = useState(false);

  return (
    <div className={clsx(s.prompt, !focused && s.blur)}>
      {prefix ?? <Ps1 />}
      <span className={s.typed}>{mask ? "•".repeat(value.length) : value}</span>
      <span className={s.cursor} aria-hidden="true" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className={s.cmdInput}
        type={mask ? "password" : "text"}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint={enterKeyHint}
      />
    </div>
  );
}
