/**
 * Session command history: no consecutive duplicates, a cursor for ↑/↓ and
 * a mirror in `sessionStorage` so a later change can restore it across
 * in-site navigation.
 */

export const HISTORY_STORAGE_KEY = "maarkn-term";
export const HISTORY_MAX = 100;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type History = {
  readonly entries: readonly string[];
  /** Records `entry` (unless it repeats the newest one) and moves the cursor past the end. */
  push: (entry: string) => void;
  /** Older entry, or `null` when already at the oldest (field keeps its text). */
  up: () => string | null;
  /** Newer entry, or `""` once past the newest. */
  down: () => string;
  /** Moves the cursor past the end without recording anything. */
  reset: () => void;
};

export type HistoryOptions = {
  initial?: readonly string[];
  max?: number;
  /** `undefined` = `sessionStorage` when available; `null` = no mirror. */
  storage?: StorageLike | null;
};

function defaultStorage(): StorageLike | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function readState(storage: StorageLike): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(HISTORY_STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Entries mirrored by a previous `createHistory` in this tab, if any. */
export function readStoredHistory(storage: StorageLike | null = defaultStorage()): string[] {
  if (!storage) return [];
  const { history } = readState(storage);
  return Array.isArray(history) ? history.filter((h): h is string => typeof h === "string") : [];
}

export function createHistory({
  initial = [],
  max = HISTORY_MAX,
  storage,
}: HistoryOptions = {}): History {
  let entries: string[] = initial.slice(-max);
  let cursor = entries.length;

  const mirror = () => {
    const target = storage === undefined ? defaultStorage() : storage;
    if (!target) return;
    try {
      // Other keys under the same storage entry belong to other modules.
      target.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify({ ...readState(target), history: entries }),
      );
    } catch {
      /* quota / private mode: history lives in memory only */
    }
  };

  return {
    get entries() {
      return entries;
    },
    push(entry) {
      if (entry && entries[entries.length - 1] !== entry) {
        entries = [...entries, entry].slice(-max);
        mirror();
      }
      cursor = entries.length;
    },
    up() {
      if (cursor === 0) return null;
      cursor -= 1;
      return entries[cursor];
    },
    down() {
      if (cursor < entries.length - 1) {
        cursor += 1;
        return entries[cursor];
      }
      cursor = entries.length;
      return "";
    },
    reset() {
      cursor = entries.length;
    },
  };
}
