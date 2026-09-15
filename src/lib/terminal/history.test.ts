import { describe, expect, it } from "vitest";
import { createHistory, HISTORY_STORAGE_KEY, readStoredHistory } from "./history";

function fakeStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

describe("history", () => {
  it("does not duplicate consecutive identical entries", () => {
    const h = createHistory({ storage: null });
    h.push("whoami");
    h.push("whoami");
    h.push("skills");
    h.push("whoami");
    expect(h.entries).toEqual(["whoami", "skills", "whoami"]);
  });

  it("ignores blank entries", () => {
    const h = createHistory({ storage: null });
    h.push("");
    expect(h.entries).toEqual([]);
  });

  it("walks up and down, emptying the field past the newest entry", () => {
    const h = createHistory({ storage: null });
    h.push("whoami");
    h.push("skills");
    expect(h.up()).toBe("skills");
    expect(h.up()).toBe("whoami");
    expect(h.up()).toBeNull(); // oldest: field keeps its text
    expect(h.down()).toBe("skills");
    expect(h.down()).toBe("");
    expect(h.down()).toBe(""); // stays empty past the end
    expect(h.up()).toBe("skills"); // and picks up again from the newest
  });

  it("push resets the cursor to the end", () => {
    const h = createHistory({ storage: null });
    h.push("a");
    h.push("b");
    h.up();
    h.up();
    h.push("c");
    expect(h.up()).toBe("c");
  });

  it("caps the number of entries", () => {
    const h = createHistory({ storage: null, max: 3 });
    for (const e of ["1", "2", "3", "4"]) h.push(e);
    expect(h.entries).toEqual(["2", "3", "4"]);
  });

  it("mirrors entries into storage without clobbering sibling keys", () => {
    const storage = fakeStorage({ [HISTORY_STORAGE_KEY]: JSON.stringify({ other: 1 }) });
    const h = createHistory({ storage });
    h.push("whoami");
    h.push("skills");
    expect(JSON.parse(storage.data.get(HISTORY_STORAGE_KEY)!)).toEqual({
      other: 1,
      history: ["whoami", "skills"],
    });
    expect(readStoredHistory(storage)).toEqual(["whoami", "skills"]);
  });

  it("survives a broken or missing storage", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const h = createHistory({ storage: broken });
    expect(() => h.push("whoami")).not.toThrow();
    expect(h.entries).toEqual(["whoami"]);
    expect(readStoredHistory(broken)).toEqual([]);
    expect(readStoredHistory(fakeStorage({ [HISTORY_STORAGE_KEY]: "not json" }))).toEqual([]);
  });
});
