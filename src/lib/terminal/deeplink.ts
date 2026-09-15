/**
 * `?cmd=` deep-links: `/{lang}?cmd=projects`, `/{lang}?cmd=whoami;skills`.
 * The value is untrusted URL input, so it is whittled down to what a visitor
 * could have typed anyway: registered names only, plain arguments, a short
 * length — anything else is dropped silently and the terminal opens as usual.
 */

/** Separator between commands in one `cmd` value. */
export const DEEPLINK_SEPARATOR = ";";
export const DEEPLINK_ARG_MAX = 80;

/**
 * `name` then, optionally, one space and up to 80 chars of letters, digits,
 * spaces, dots and hyphens. Names are the ones the registry knows (letters
 * and `?`); numeric shortcuts and anything else are not linkable.
 */
const LINE = /^([a-z?]+)(?: ([a-z0-9 .-]{0,80}))?$/i;

/**
 * Commands that take free text and would spend a third party's quota (or
 * just look wrong) when run from a link: with no argument they are typed
 * into the prompt instead of executed; with one they are ignored.
 */
const PREFILL_ONLY = new Set(["ask"]);

export type DeepLink = {
  /** Sanitised lines to execute, in order. */
  run: string[];
  /** Text left typed in the prompt (`ask `), when the link asks for it. */
  prefill?: string;
};

export const EMPTY_DEEPLINK: DeepLink = { run: [] };

/**
 * Splits and validates a raw `cmd` value. `isKnown` answers whether a name
 * resolves in the registry (aliases included).
 */
export function parseDeepLink(raw: string | null | undefined, isKnown: (name: string) => boolean): DeepLink {
  if (!raw) return EMPTY_DEEPLINK;
  const run: string[] = [];
  let prefill: string | undefined;

  for (const part of raw.split(DEEPLINK_SEPARATOR)) {
    const text = part.trim().replace(/\s+/g, " ");
    const match = LINE.exec(text);
    if (!match) continue;
    const name = match[1].toLowerCase();
    const args = match[2]?.trim() ?? "";

    if (PREFILL_ONLY.has(name)) {
      if (!args) prefill = `${name} `;
      continue;
    }
    if (!isKnown(name)) continue;
    run.push(args ? `${name} ${args}` : name);
  }

  return prefill === undefined ? { run } : { run, prefill };
}
