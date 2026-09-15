import { describe, expect, it } from "vitest";
import { createHistory } from "./history";
import {
  discardSession,
  LAST_COMMANDS_MAX,
  patchSession,
  readSession,
  recordCommand,
  SESSION_STORAGE_KEY,
} from "./session";

function fakeStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

describe("session state", () => {
  it("starts empty and tolerates garbage", () => {
    expect(readSession(fakeStorage())).toEqual({ lastCommands: [] });
    expect(readSession(fakeStorage({ [SESSION_STORAGE_KEY]: "not json" }))).toEqual({
      lastCommands: [],
    });
    expect(
      readSession(fakeStorage({ [SESSION_STORAGE_KEY]: '{"lastCommands":[1,"x"],"cmd":3}' })),
    ).toEqual({ lastCommands: [] });
    expect(readSession(null)).toEqual({ lastCommands: [] });
  });

  it("records replayable commands, newest last, capped at the maximum", () => {
    const storage = fakeStorage();
    for (let i = 0; i < LAST_COMMANDS_MAX + 3; i++) recordCommand(`echo ${i}`, "echo", storage);
    const { lastCommands } = readSession(storage);
    expect(lastCommands).toHaveLength(LAST_COMMANDS_MAX);
    expect(lastCommands[0]).toBe("echo 3");
    expect(lastCommands[LAST_COMMANDS_MAX - 1]).toBe(`echo ${LAST_COMMANDS_MAX + 2}`);
  });

  it("leaves out navigation, side effects, screen wipes and unknown commands", () => {
    const storage = fakeStorage();
    recordCommand("whoami", "whoami", storage);
    recordCommand("open 1", "open", storage);
    recordCommand("read 2", "read", storage);
    recordCommand("ask hi", "ask", storage);
    recordCommand("mail", "mail", storage);
    recordCommand("cd blog", "cd", storage);
    recordCommand("lang pt", "lang", storage);
    recordCommand("resume", "cv", storage);
    recordCommand("clear", "clear", storage);
    recordCommand("reboot", "reboot", storage);
    recordCommand("foo", undefined, storage);
    recordCommand("projects", "projects", storage);
    expect(readSession(storage).lastCommands).toEqual(["whoami", "projects"]);
  });

  it("shares the storage entry with the history without clobbering it", () => {
    const storage = fakeStorage();
    const history = createHistory({ storage });
    history.push("whoami");
    recordCommand("whoami", "whoami", storage);
    patchSession({ cmd: "whoami" }, storage);
    history.push("skills");
    expect(JSON.parse(storage.data.get(SESSION_STORAGE_KEY)!)).toEqual({
      history: ["whoami", "skills"],
      lastCommands: ["whoami"],
      cmd: "whoami",
    });
  });

  it("clear discards the commands and the consumed deep-link, not the history", () => {
    const storage = fakeStorage();
    createHistory({ storage }).push("whoami");
    recordCommand("whoami", "whoami", storage);
    patchSession({ cmd: "whoami" }, storage);
    discardSession(storage);
    expect(readSession(storage)).toEqual({ lastCommands: [] });
    expect(JSON.parse(storage.data.get(SESSION_STORAGE_KEY)!)).toEqual({
      history: ["whoami"],
      lastCommands: [],
    });
  });
});
