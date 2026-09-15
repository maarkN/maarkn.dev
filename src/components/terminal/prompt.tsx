"use client";

import { useId, useState, type KeyboardEvent, type Ref } from "react";
import { clsx } from "clsx";
import { site } from "@/lib/site";
import s from "./terminal.module.css";

export const PROMPT_USER = `${site.nick}@dev`;

/** `maarkn@dev:~$ ` — used by the prompt and by echoed command lines. */
export function Ps1() {
  return (
    <span className={s.ps1}>
      <span className={s.u}>{PROMPT_USER}</span>:<span className={s.h}>~</span>${" "}
    </span>
  );
}

export function Prompt({
  value,
  onChange,
  onKeyDown,
  label,
  ref,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** Accessible name of the (visually hidden) input. */
  label: string;
  ref?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  return (
    <div className={clsx(s.prompt, !focused && s.blur)}>
      <Ps1 />
      <span className={s.typed}>{value}</span>
      <span className={s.cursor} aria-hidden="true" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className={s.cmdInput}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
      />
    </div>
  );
}
