import { describe, expect, it } from "vitest";
import { commonPrefix, complete } from "./complete";

// Registration order from the mockup: content commands first, then system.
const COMMANDS = [
  "help",
  "whoami",
  "experience",
  "skills",
  "projects",
  "writing",
  "contact",
  "cv",
  "ls",
  "cat",
  "theme",
  "font",
  "history",
  "whereami",
  "clear",
];
const FILES = ["whoami.txt", "experience.log", "skills.sys", "writing.md"];

describe("complete", () => {
  it("completes a single candidate and appends a space", () => {
    expect(complete("proj", COMMANDS)).toEqual({ kind: "replace", value: "projects " });
  });

  it("lists candidates when the common prefix is already typed", () => {
    expect(complete("w", COMMANDS)).toEqual({
      kind: "list",
      candidates: ["whoami", "writing", "whereami"],
    });
  });

  it("grows the field to the common prefix when it can", () => {
    expect(complete("wh", COMMANDS)).toEqual({ kind: "list", candidates: ["whoami", "whereami"] });
    expect(complete("e", COMMANDS)).toEqual({ kind: "replace", value: "experience " });
    expect(complete("c", ["cat", "cd", "cv", "clear", "contact"])).toEqual({
      kind: "list",
      candidates: ["cat", "cd", "cv", "clear", "contact"],
    });
    expect(complete("h", ["history", "hint"])).toEqual({ kind: "replace", value: "hi" });
    expect(complete("hi", ["history", "hint"])).toEqual({
      kind: "list",
      candidates: ["history", "hint"],
    });
  });

  it("completes file names after cat", () => {
    expect(complete("cat wh", COMMANDS, FILES)).toEqual({
      kind: "replace",
      value: "cat whoami.txt ",
    });
    expect(complete("cat ", COMMANDS, FILES)).toEqual({ kind: "list", candidates: FILES });
    expect(complete("cat s", COMMANDS, FILES)).toEqual({
      kind: "replace",
      value: "cat skills.sys ",
    });
  });

  it("lists every command on an empty field", () => {
    expect(complete("", COMMANDS)).toEqual({ kind: "list", candidates: COMMANDS });
  });

  it("does nothing without candidates or after another command", () => {
    expect(complete("zzz", COMMANDS)).toEqual({ kind: "none" });
    expect(complete("echo wh", COMMANDS, FILES)).toEqual({ kind: "none" });
    expect(complete("cat zzz", COMMANDS, FILES)).toEqual({ kind: "none" });
  });

  it("commonPrefix", () => {
    expect(commonPrefix(["whoami", "whereami"])).toBe("wh");
    expect(commonPrefix(["abc"])).toBe("abc");
    expect(commonPrefix([])).toBe("");
  });
});
