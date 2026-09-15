/**
 * What the terminal keeps in `sessionStorage["maarkn-term"]` besides the
 * history (`history.ts` mirrors that key on its own): the last commands
 * whose output makes up the screen and the deep-link already consumed. On
 * the way back from an inner page the shell re-executes `lastCommands`
 * instead of storing rendered output — the content is fresh and the entries
 * are small.
 */
import { HISTORY_STORAGE_KEY } from "./history";

export const SESSION_STORAGE_KEY = HISTORY_STORAGE_KEY;
/** How many commands the screen is rebuilt from. */
export const LAST_COMMANDS_MAX = 10;

/**
 * Commands whose re-execution would navigate, open something or wipe the
 * screen: never part of the rebuilt output. Names, not raw lines — aliases
 * (`resume` → `cv`) are resolved before the check.
 */
export const NON_REPLAYABLE = new Set([
  "open",
  "read",
  "ask",
  "mail",
  "cd",
  "lang",
  "cv",
  "clear",
  "cls",
  "reboot",
]);

export type SessionState = {
  lastCommands: string[];
  /** The `?cmd=` value already executed on this screen, if any. */
  cmd?: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function readRaw(storage: StorageLike): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SESSION_STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => typeof item === "string");

export function readSession(storage: StorageLike | null = defaultStorage()): SessionState {
  if (!storage) return { lastCommands: [] };
  const raw = readRaw(storage);
  const lastCommands = isStringArray(raw.lastCommands)
    ? raw.lastCommands.slice(-LAST_COMMANDS_MAX)
    : [];
  return typeof raw.cmd === "string" ? { lastCommands, cmd: raw.cmd } : { lastCommands };
}

/** Merges `patch` into the stored entry, leaving other modules' keys alone. */
export function patchSession(
  patch: Partial<SessionState>,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    const next: Record<string, unknown> = { ...readRaw(storage), ...patch };
    for (const key of Object.keys(patch) as (keyof SessionState)[]) {
      if (patch[key] === undefined) delete next[key];
    }
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode: the screen is simply not rebuilt later */
  }
}

/**
 * Appends a line that resolved to `resolvedName`, keeping the newest
 * `LAST_COMMANDS_MAX`. Unknown commands printed an error, not output, and
 * are not worth replaying.
 */
export function recordCommand(
  line: string,
  resolvedName: string | undefined,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (resolvedName === undefined || NON_REPLAYABLE.has(resolvedName)) return;
  const { lastCommands } = readSession(storage);
  patchSession({ lastCommands: [...lastCommands, line].slice(-LAST_COMMANDS_MAX) }, storage);
}

/** `clear`: the screen is empty, so there is nothing to rebuild. */
export function discardSession(storage: StorageLike | null = defaultStorage()): void {
  patchSession({ lastCommands: [], cmd: undefined }, storage);
}
