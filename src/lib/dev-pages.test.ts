import { readdirSync } from "node:fs";
import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import { pageExtensions } from "../../next.config";

/** The pages and layouts Next finds in src/app with a given list of extensions. */
function routes(extensions: string[]): string[] {
  const names = new Set(["page", "layout"].flatMap((name) => extensions.map((ext) => `${name}.${ext}`)));
  return (readdirSync("src/app", { recursive: true }) as string[]).filter((file) => names.has(basename(file)));
}

describe("internal pages", () => {
  it("are not routes of a production build", () => {
    const production = routes(pageExtensions({ NODE_ENV: "production" }));
    expect(production).toContain("[lang]/(terminal)/page.tsx");
    expect(production.filter((file) => file.includes(".dev."))).toEqual([]);
    expect(production.filter((file) => file.includes("holo"))).toEqual([]);
  });

  it("are routes in development, and in a build that asks for them", () => {
    for (const env of [{ NODE_ENV: "development" }, { NODE_ENV: "production", HOLO_REFERENCE: "1" }]) {
      expect(routes(pageExtensions(env))).toContain("[lang]/(dev)/holo/page.dev.tsx");
    }
  });

  it("need the exact opt-in", () => {
    for (const value of ["", "0", "true", undefined]) {
      expect(pageExtensions({ NODE_ENV: "production", HOLO_REFERENCE: value })).not.toContain("dev.tsx");
    }
  });
});
