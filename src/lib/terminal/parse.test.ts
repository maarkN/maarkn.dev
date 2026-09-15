import { describe, expect, it } from "vitest";
import { parse, tokenize } from "./parse";

describe("parse", () => {
  it("splits on any whitespace and trims", () => {
    expect(tokenize("  cat   whoami.txt \t x ")).toEqual(["cat", "whoami.txt", "x"]);
    expect(parse("  cat   whoami.txt ")).toEqual({ name: "cat", args: ["whoami.txt"] });
  });

  it("returns null for blank input", () => {
    expect(parse("")).toBeNull();
    expect(parse("   ")).toBeNull();
    expect(tokenize("   ")).toEqual([]);
  });

  it("keeps the typed case of the name for error messages", () => {
    expect(parse("Foo bar")).toEqual({ name: "Foo", args: ["bar"] });
  });

  it("never interprets input as markup", () => {
    const raw = "<img src=x onerror=alert(1)>";
    expect(parse(raw)).toEqual({ name: "<img", args: ["src=x", "onerror=alert(1)>"] });
  });
});
