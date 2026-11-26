import { describe, expect, it } from "vitest";
import { clearedHref, currentHref, parseSort, sortHref } from "./sort";

const KEYS = ["company", "stage", "updated"] as const;
const DEFAULT = { key: "stage", dir: "asc" } as const;

describe("the order of a list, in the URL", () => {
  it("is read from the address, among the allowed columns", () => {
    expect(parseSort({ sort: "updated", dir: "desc" }, KEYS, DEFAULT)).toEqual({ key: "updated", dir: "desc" });
    expect(parseSort({ sort: "company" }, KEYS, DEFAULT)).toEqual({ key: "company", dir: "asc" });
  });

  it("falls back to the default for anything else, never passing it to the database", () => {
    expect(parseSort({}, KEYS, DEFAULT)).toEqual(DEFAULT);
    expect(parseSort({ sort: "passwordHash", dir: "desc" }, KEYS, DEFAULT)).toEqual(DEFAULT);
    expect(parseSort({ sort: "updated", dir: "sideways" }, KEYS, DEFAULT)).toEqual({ key: "updated", dir: "asc" });
  });

  it("turns the same column the other way, keeps every filter and goes back to the first page", () => {
    const params = { q: "acme", route: "relocation", page: "3", sort: "updated", dir: "desc" };
    const current = { key: "updated", dir: "desc" } as const;
    const flipped = new URL(sortHref("/admin/applications", params, current, "updated"), "http://x").searchParams;
    expect(Object.fromEntries(flipped)).toEqual({ q: "acme", route: "relocation", sort: "updated", dir: "asc" });

    const other = new URL(sortHref("/admin/applications", params, current, "company"), "http://x").searchParams;
    expect(other.get("sort")).toBe("company");
    expect(other.get("dir")).toBe("asc");
    expect(other.has("page")).toBe(false);
  });

  it("starts a date column with the newest", () => {
    const href = sortHref("/admin/applications", {}, DEFAULT, "updated", "desc");
    expect(href).toBe("/admin/applications?sort=updated&dir=desc");
  });

  it("clears to the bare list, keeping only what is asked", () => {
    expect(clearedHref("/admin/contacts")).toBe("/admin/contacts");
    expect(clearedHref("/admin/contacts", { tab: "references" })).toBe("/admin/contacts?tab=references");
  });

  it("reloads exactly what is on screen", () => {
    expect(currentHref("/admin/jobs", { q: "go", page: "2", verdict: ["kept", "x"] })).toBe("/admin/jobs?q=go&page=2&verdict=kept");
  });
});
