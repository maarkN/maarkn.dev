// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { placeToReturn, rememberPlace } from "./place";

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("the way back from the CLI version", () => {
  it("is the page the visitor was on, filters included", () => {
    rememberPlace("/en/projects?cat=ai");
    expect(placeToReturn("en")).toBe("/en/projects?cat=ai");
  });

  it("follows a change of language made on the CLI version", () => {
    rememberPlace("/pt-BR/projects/x");
    expect(placeToReturn("en")).toBe("/en/projects/x");
    rememberPlace("/pt-BR");
    expect(placeToReturn("en")).toBe("/en");
  });

  it("is the home when there is nothing to go back to", () => {
    expect(placeToReturn("pt-BR")).toBe("/pt-BR");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(placeToReturn("pt-BR")).toBe("/pt-BR");
  });

  it("never leaves the site, nor goes round to the CLI version", () => {
    for (const place of ["//evil.example/en", "https://evil.example/en", "/\\evil.example", "/admin", "/en/terminal?cmd=x", "nonsense"]) {
      rememberPlace(place);
      expect(placeToReturn("en"), place).toBe("/en");
    }
  });

  it("survives a storage that refuses to keep it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => rememberPlace("/en/projects")).not.toThrow();
  });
});
